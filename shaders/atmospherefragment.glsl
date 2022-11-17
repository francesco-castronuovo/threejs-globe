varying vec3 vertexNormal;

void main() {
  float intensity = pow(0.87 - dot(vertexNormal, vec3(0.0, 0.0, 1.0)), 2.0);
  gl_FragColor = vec4(0.08, 0.15, 0.61, 1.0) * intensity;
}
