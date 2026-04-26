/**
 * WebGL2 shaders from CodePen https://codepen.io/atzedent/pen/WNJOOJX ("Just a Beauty")
 * Author: Matthias Hurrle (@atzedent)
 */
export const WNJOOJX_VERTEX = `#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

in vec2 position;

void main(void) {
    gl_Position = vec4(position, 0., 1.);
}
`;

export const WNJOOJX_FRAGMENT = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*/

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform int pointerCount;
uniform vec2 touch;
uniform float time;

const float PI = radians(180.);
const float TAU = 2.*PI;
const float IOR = 1.45;
const float DENSE = .7;

#define MAX_STEPS 100
#define MAX_DIST 20.
#define SURF_DIST .001

#define S smoothstep
#define T 3.5 + time

out vec4 fragColor;

vec2 MatMin(vec2 lhs, vec2 rhs) {
  if (lhs.x < rhs.x) return lhs;

  return rhs;
}

float cLength(vec2 p, float k) {
  p = abs(p);

  return pow(pow(p.x, k)+pow(p.y, k), 1./k);
}

mat2 Rot(float a) {
  float s = sin(a),
  c = cos(a);
  return mat2(c, -s, s, c);
}

float Spiral(vec2 p, float t, float k) {
  float r = cLength(p, k);
  float a = atan(p.y, p.x) / TAU;

  return sin(fract(log(r) * t + a));
}

float Octahedron(vec3 p, float s) {
  p = abs(p);

  return (p.x + p.y + p.z - s) * (1. / sqrt(3.));
}

vec2 GetDist(vec3 p) {
  vec2 md = MatMin(
    vec2(
      Octahedron(p, 1.),
      1.
    ),
    vec2(
      dot(
        p,
        normalize(vec3(.0, 1., .0))
      ) + 2., 2.
    )
  );

  return md;
}

vec2 RayMarch(vec3 ro, vec3 rd, float side) {
  float dO = 0.;
  vec2 d;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd*dO;
    d = GetDist(p) * side;
    dO += d.x;

    if (dO > MAX_DIST || abs(d.x) < SURF_DIST) break;
  }

  return vec2(dO, d.y);
}

vec3 GetNormal(vec3 p) {
  float d = GetDist(p).x;
  vec2 e = vec2(.05, 0);

  vec3 n = d - vec3(
    GetDist(p-e.xyy).x,
    GetDist(p-e.yxy).x,
    GetDist(p-e.yyx).x);

  return normalize(n);
}

vec3 GetRayDir(vec2 uv, vec3 p, vec3 l, float z) {
  vec3 f = normalize(l-p),
  r = normalize(cross(vec3(0, 1, 0), f)),
  u = cross(f, r),
  c = f*z,
  i = c + uv.x*r + uv.y*u,
  d = normalize(i);
  return d;
}

vec3 Refract(vec3 p, vec3 n, inout vec3 ro, inout vec3 rd, inout float od) {
  vec3 rdIn = refract(rd, n, 1./IOR);
  vec3 pEnter = p-n*SURF_DIST*3.;
  vec2 dIn = RayMarch(pEnter, rdIn, -1.);
  vec3 pExit = pEnter + rdIn * dIn.x;
  vec3 nExit = -GetNormal(pExit);
  vec3 rdOut = refract(rdIn, nExit, IOR);

  if (dot(rdOut, rdOut) == .0) {
    rdOut = reflect(rdIn, nExit);
  }

  ro = pEnter;
  rd = rdOut;
  od = exp(-dIn.x * DENSE);

  return pExit;
}

vec3 Render(inout vec3 ro, inout vec3 rd, inout float ref) {
  vec2 d = RayMarch(ro, rd, 1.);

  vec3 col = vec3(.0);

  if (d.x < MAX_DIST) {
    vec3 p = ro + rd * d.x;
    vec3 l = normalize(ro);
    vec3 n = GetNormal(p);
    vec3 r = reflect(rd, n);

    // material
    vec3 mat = vec3(.0);
    float fres = pow(clamp(1.+dot(n, rd), .0, 1.), 5.);

		vec3 offs = vec3(.25)*length(p.xz);
    float s = 1.5 * sin(T*.5);
    float k = .5 + 1. * (.5+.5*cos(T*.5));
    mat2 rot = Rot(T*.5);

    // floor
    if (d.y == 2.) {

      float spiral = clamp(
        Spiral(p.xz*rot, s, k),
        .0,
        1.
      );

      mat = pow(vec3(spiral) - offs, vec3(offs));

      ro = p + n * SURF_DIST * 3.;
      rd = r;

    }
    // object
    else if (d.y == 1.) {

      float od;
      vec3 st = Refract(p, n, ro, rd, od);
      float spiral = Spiral(st.xz*rot, s, k);
      
      vec3 si = pow(vec3(spiral) - offs, vec3(offs));

      mat = mix(
        si,
        vec3(1.5, 1.75, 2.),
        od
      ) - pow(1.-abs(ro.y), 2.);
      mat *= exp(log(vec3(.5)));

      ref = mix(.05, .5, fres);
    }

    // light
    float diffuse = dot(n, l) * .5 + .5;
  
    float spot = clamp(
      dot(
        normalize(r),
        reflect(r, vec3(0))),
      .0,
      1.
    );
  
    col += .8 * diffuse;
    col += .95 * pow(spot, 16.);
  
    col *= mat;
  }

  return col;
}

void main(void) {
  float mn = min(resolution.x, resolution.y);
  float mx = max(resolution.x, resolution.y);
  vec2 uv = (
    gl_FragCoord.xy - .5 * resolution.xy
  ) / mx;

  vec2 m = touch.xy / resolution.xy;
  m.y = clamp(m.y, .0, .55);

  vec3 ro = vec3(0., 3., -6.);
  bool aut = pointerCount == 0;

  ro.yz *= Rot(aut ? .55+sin(T*.25)*.5: -m.y * PI + 1.);
  ro.xz *= Rot(aut ? T*.25: -m.x * TAU);

  vec3 rd = GetRayDir(uv, ro, vec3(0), 1.);
  vec3 sto = ro;

  float ref = .0;
  vec3 col = Render(ro, rd, ref);

  for (int i = 0; i < 2; i++) {
    col += ref * Render(ro, rd, ref);
  }

  // gamma correction
  col = pow(col, vec3(.45));

  // vignette
  vec2 z = (gl_FragCoord.xy -.5 * resolution) / mn;
  col *= 1. - dot(z, z);

  fragColor = vec4(col, 1.);
}
`;
