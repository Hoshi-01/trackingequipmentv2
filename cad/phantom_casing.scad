// Phantom USG casing (parametric) - OpenSCAD
// Units: mm

$fn = 64;

// ---------- User parameters ----------
inner_len = 140;      // inner cavity length (X)
inner_wid = 90;       // inner cavity width (Y)
inner_depth = 60;     // cavity depth (Z, from floor to underside of flange)

wall = 4;             // side wall thickness
floor = 4;            // bottom thickness

flange_thick = 5;     // thickness of top flange
flange_width = 15;    // flange extension beyond outer wall

window_len = 120;     // scanning window length
window_wid = 70;      // scanning window width

bolt_dia = 4.5;       // clearance hole diameter (M4 ~ 4.5, M5 ~ 5.5)
bolt_edge = 8;        // distance from flange outer edge to hole center
bolt_pitch = 25;      // approximate spacing along edges

clamp_thick = 6;      // clamp ring thickness

// Gasket groove (optional)
use_groove = true;
groove_w = 3;         // groove width
groove_d = 1.5;       // groove depth
groove_offset = 4;    // gap from window edge to groove inner edge

// Choose which part to render:
// 0 = assembly, 1 = body, 2 = clamp
part_mode = 0;
// -------------------------------------

outer_len = inner_len + 2*wall;
outer_wid = inner_wid + 2*wall;

flange_len = outer_len + 2*flange_width;
flange_wid = outer_wid + 2*flange_width;

box_x = flange_width;
box_y = flange_width;
box_z = 0;

flange_z = floor + inner_depth;

win_x = (flange_len - window_len)/2;
win_y = (flange_wid - window_wid)/2;

module bolt_holes(z=0, h=20) {
  // Top/bottom edges
  for (x = [bolt_edge : bolt_pitch : flange_len - bolt_edge]) {
    translate([x, bolt_edge, z]) cylinder(d=bolt_dia, h=h);
    translate([x, flange_wid - bolt_edge, z]) cylinder(d=bolt_dia, h=h);
  }
  // Left/right edges
  for (y = [bolt_edge : bolt_pitch : flange_wid - bolt_edge]) {
    translate([bolt_edge, y, z]) cylinder(d=bolt_dia, h=h);
    translate([flange_len - bolt_edge, y, z]) cylinder(d=bolt_dia, h=h);
  }
}

module gasket_groove() {
  // Rectangular groove around window
  translate([win_x - groove_offset - groove_w, win_y - groove_offset - groove_w, flange_z + flange_thick - groove_d])
    difference() {
      cube([window_len + 2*(groove_offset + groove_w), window_wid + 2*(groove_offset + groove_w), groove_d + 0.2]);
      translate([groove_w, groove_w, -0.1])
        cube([window_len + 2*groove_offset, window_wid + 2*groove_offset, groove_d + 0.4]);
    }
}

module body() {
  difference() {
    union() {
      // Main box
      translate([box_x, box_y, box_z])
        cube([outer_len, outer_wid, floor + inner_depth]);
      // Flange plate
      translate([0, 0, flange_z])
        cube([flange_len, flange_wid, flange_thick]);
    }

    // Inner cavity
    translate([box_x + wall, box_y + wall, floor])
      cube([inner_len, inner_wid, inner_depth + flange_thick + 1]);

    // Scanning window
    translate([win_x, win_y, flange_z - 0.1])
      cube([window_len, window_wid, flange_thick + 1]);

    // Bolt holes through flange and wall region
    bolt_holes(z=0, h=flange_z + flange_thick + 1);

    // Optional gasket groove
    if (use_groove) gasket_groove();
  }
}

module clamp() {
  difference() {
    cube([flange_len, flange_wid, clamp_thick]);
    translate([win_x, win_y, -0.1])
      cube([window_len, window_wid, clamp_thick + 0.2]);
    bolt_holes(z=-0.1, h=clamp_thick + 0.2);
  }
}

// Render
if (part_mode == 1) {
  body();
} else if (part_mode == 2) {
  clamp();
} else {
  body();
  translate([0, 0, flange_z + flange_thick + 2]) clamp();
}
