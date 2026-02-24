# Phantom USG Casing (OpenSCAD)

File: `phantom_casing.scad`

## Cara Pakai
1. Buka `phantom_casing.scad` di OpenSCAD.
2. Ubah parameter di bagian **User parameters** sesuai ukuran phantom kamu.
3. Set `part_mode = 1` untuk `body` atau `part_mode = 2` untuk `clamp`.
4. Untuk preview, biarkan `part_mode = 0` (assembly).

## Catatan Desain
- Lubang baut mengikuti `bolt_pitch` dan `bolt_edge` di sekeliling flange.
- `use_groove = true` membuat alur gasket di flange (untuk O-ring/silicone sheet).
- Jika kamu mau clamp lebih kecil dari flange, beritahu aku ? bisa aku modif.
