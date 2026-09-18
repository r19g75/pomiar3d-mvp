bl_info = {
    "name": "Pomiar 3D Importer",
    "author": "Pomiar 3D project",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "File > Import > Pomiar 3D (.pomiar3d)",
    "description": "Imports semantic Pomiar 3D measurements as Blender geometry",
    "category": "Import-Export",
}

import json
import math
import bpy
from bpy_extras.io_utils import ImportHelper
from bpy.props import StringProperty
from bpy.types import Operator

MM_TO_M = 0.001


def ensure_collection(name, parent=None):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        if parent is None:
            bpy.context.scene.collection.children.link(collection)
        else:
            parent.children.link(collection)
    return collection


def move_object_to_collection(obj, collection):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)


def add_wall(wall, points, collection):
    a = points.get(wall.get("from"))
    b = points.get(wall.get("to"))
    if not a or not b:
        return

    ax, ay, az = [a[axis] * MM_TO_M for axis in ("x", "y", "z")]
    bx, by, bz = [b[axis] * MM_TO_M for axis in ("x", "y", "z")]
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    height = max(float(wall.get("heightMm", 0)) * MM_TO_M, 0.01)
    thickness = max(float(wall.get("thicknessMm", 0)) * MM_TO_M, 0.01)

    bpy.ops.mesh.primitive_cube_add(size=1, location=((ax + bx) / 2, (ay + by) / 2, min(az, bz) + height / 2))
    obj = bpy.context.active_object
    obj.name = wall.get("id", "Wall")
    obj.dimensions = (length, thickness, height)
    obj.rotation_euler[2] = math.atan2(dy, dx)
    obj["pomiar3d_type"] = "wall"
    obj["pomiar3d_status"] = wall.get("status", "")
    obj["pomiar3d_state"] = wall.get("state", "existing")
    obj["pomiar3d_from"] = wall.get("from", "")
    obj["pomiar3d_to"] = wall.get("to", "")
    if wall.get("note"):
        obj["pomiar3d_note"] = wall["note"]
    move_object_to_collection(obj, collection)


def add_reference_point(point, collection):
    pos = point.get("position", {})
    location = tuple(float(pos.get(k, 0)) * MM_TO_M for k in ("x", "y", "z"))
    bpy.ops.object.empty_add(type='SPHERE', radius=0.04, location=location)
    obj = bpy.context.active_object
    obj.name = point.get("id", "Point")
    obj["pomiar3d_type"] = "reference_point"
    obj["pomiar3d_source"] = point.get("source", "")
    move_object_to_collection(obj, collection)


def import_project(data):
    if data.get("format") != "pomiar3d" or data.get("version") != 1:
        raise ValueError("Unsupported Pomiar 3D format")

    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.length_unit = 'METERS'

    root = ensure_collection(f"Pomiar3D_{data.get('name', 'Project')}")

    for area in data.get("areas", []):
        area_col = ensure_collection(f"AREA_{area.get('name', area.get('id', 'Area'))}", root)
        existing = ensure_collection("EXISTING", area_col)
        reconstructed = ensure_collection("RECONSTRUCTED", area_col)
        proposed = ensure_collection("PROPOSED", area_col)
        points_col = ensure_collection("REFERENCE_POINTS", area_col)

        point_positions = {p.get("id"): p.get("position", {}) for p in area.get("points", [])}
        for point in area.get("points", []):
            add_reference_point(point, points_col)

        target_by_state = {
            "existing": existing,
            "reconstructed": reconstructed,
            "proposed": proposed,
        }
        for wall in area.get("walls", []):
            add_wall(wall, point_positions, target_by_state.get(wall.get("state", "existing"), existing))

        area_col["pomiar3d_area_id"] = area.get("id", "")
        area_col["pomiar3d_kind"] = area.get("kind", "")


class IMPORT_OT_pomiar3d(Operator, ImportHelper):
    bl_idname = "import_scene.pomiar3d"
    bl_label = "Import Pomiar 3D"
    bl_options = {'UNDO'}

    filename_ext = ".pomiar3d"
    filter_glob: StringProperty(default="*.pomiar3d;*.json", options={'HIDDEN'})

    def execute(self, context):
        try:
            with open(self.filepath, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            import_project(data)
        except Exception as exc:
            self.report({'ERROR'}, str(exc))
            return {'CANCELLED'}
        return {'FINISHED'}


def menu_func_import(self, context):
    self.layout.operator(IMPORT_OT_pomiar3d.bl_idname, text="Pomiar 3D (.pomiar3d)")


def register():
    bpy.utils.register_class(IMPORT_OT_pomiar3d)
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)


def unregister():
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)
    bpy.utils.unregister_class(IMPORT_OT_pomiar3d)


if __name__ == "__main__":
    register()
