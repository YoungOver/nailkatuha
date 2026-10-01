import {
  BackSide,
  BufferAttribute,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  TorusGeometry,
  type WebGLRenderer,
} from 'three'

/*
 * Studio light: a few emissive panels rendered once into a prefiltered
 * environment map, like softboxes in product photography. It gives the
 * lacquer its long glossy highlights without downloading an HDR file.
 */
export function buildStudio(gl: WebGLRenderer) {
  const pmrem = new PMREMGenerator(gl)
  const room = new Scene()
  const add = (mesh: Mesh, pos: [number, number, number]) => {
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    room.add(mesh)
  }
  const light = (color: string, power: number) => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power), side: DoubleSide })
  /* a cyclorama around the set: bright ceiling, grey horizon, dark floor, so metal (chrome) always has something to mirror */
  const dome = new SphereGeometry(30, 32, 16)
  const tint = new Float32Array(dome.attributes.position.count * 3)
  for (let i = 0; i < dome.attributes.position.count; i++) {
    const y = dome.attributes.position.getY(i) / 30
    const v = y > 0 ? 0.1 + 0.75 * y * y : 0.1 * (1 + y) + 0.02
    tint.set([v * 1.02, v * 0.98, v * 1.05], i * 3)
  }
  dome.setAttribute('color', new BufferAttribute(tint, 3))
  room.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })))
  add(new Mesh(new PlaneGeometry(5, 2.5), light('#ffffff', 3.2)), [-3, 3, 4])
  add(new Mesh(new PlaneGeometry(1.2, 6), light('#ffffff', 2)), [4, 0.5, 3])
  add(new Mesh(new TorusGeometry(1.25, 0.09, 12, 64), light('#ffd6e6', 1.4)), [0, -3, 3])
  add(new Mesh(new PlaneGeometry(8, 2), light('#b9a6ff', 0.8)), [0, 4, -4])
  const target = pmrem.fromScene(room, 0.03)
  room.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose()
      ;(o.material as MeshBasicMaterial).dispose()
    }
  })
  pmrem.dispose()
  return target
}

