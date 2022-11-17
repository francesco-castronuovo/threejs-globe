const vertexShader = require('./shaders/vertex.glsl')
const fragmentShader = require('./shaders/fragment.glsl')
const atmosphereVertexShader = require('./shaders/atmospherevertex.glsl')
const atmosphereFragmentShader = require('./shaders/atmospherefragment.glsl')

const canvasContainer = document.querySelector('.canvas-embed');

const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  75,
  canvasContainer.offsetWidth / canvasContainer.offsetHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector('canvas')
});

renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(5, 50, 50),
  new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      globeTexture: {
        value: new THREE.TextureLoader().load('https://uploads-ssl.webflow.com/633b2986225baf6d7bd77b86/633b3828238f512fecf4c991_earth.jpg')
      }
    }
  })
);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(5, 50, 50),
  new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
);

atmosphere.scale.set(1.1, 1.1, 1.1);

scene.add(atmosphere);

const group = new THREE.Group();
group.add(sphere);
scene.add(group);

const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff
});

const starVertices = [];
for(let i = 0; i < 2000; i++) {
  const x = (Math.random() - 0.5) * innerWidth;
  const y = (Math.random() - 0.5) * innerHeight;
  const z = -500 - Math.random() * 2000;
  starVertices.push(x, y, z);
}

starGeometry.setAttribute('position',
  new THREE.Float32BufferAttribute(starVertices, 3));

const stars = new THREE.Points(starGeometry, starMaterial);

scene.add(stars);

camera.position.z = 11;

function createBox({lat, lng, num, country}) {

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, num),
    new THREE.MeshBasicMaterial({
      color: '#046EC4',
      opacity: 0.4,
      transparent: true
    })
  );

  const latitude = (parseFloat(lat) / 180) * Math.PI;
  const longitude = (parseFloat(lng) / 180) * Math.PI;
  const radius = 5;

  const x = radius * Math.cos(latitude) * Math.sin(longitude);
  const y = radius * Math.sin(latitude);
  const z = radius * Math.cos(latitude) * Math.cos(longitude);

  box.position.x = x;
  box.position.y = y;
  box.position.z = z;

  box.lookAt(0, 0, 0);
  box.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -num/2))

  group.add(box);

  gsap.to(box.scale, {
    z: 1.4,
    duration: 2,
    ease: "power3.out",
    yoyo: true,
    repeat: -1,
    delay: Math.random()
  });

  box.country = country;
}

let clientData = $('[fc-client-data = list]').find('.w-dyn-item');
let maxNum = 0;

clientData.each(function() {
  let num = parseInt($(this).find('[fc-client-data = number]').text());
  if(num > maxNum)
    maxNum = num;
});

clientData.each(function() {
  let lat = $(this).find('[fc-client-data = latitude]').text();
  let lng = $(this).find('[fc-client-data = longitude]').text();
  let num = $(this).find('[fc-client-data = number]').text();
  let loc = $(this).find('[fc-client-data = location]').text();

  num = (num/maxNum + (maxNum - num)/(maxNum * 2));    

  createBox({lat: lat, lng: lng, num: num, country: loc});
});

sphere.rotation.y = - Math.PI / 2;
group.rotation.offset = {
  x: 0,
  y: 0
}

const mouse = {
  x: undefined,
  y: undefined,
  down: false,
  xPrev: undefined,
  yPrev: undefined
}

const raycaster = new THREE.Raycaster();

const popup = document.querySelector('[fc-popup = element]');
const popupText = popup.querySelector('[fc-client-data = location]');
popup.style.visibility = "hidden";
popup.style.opacity = 0;

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  group.rotation.y += 0.001;

  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(group.children.filter(mesh => {
    return mesh.geometry.type === 'BoxGeometry';
  }));

  const intersectObjects = intersects.map(inter => inter.object);

  if(intersects.length === 0) {
    gsap.set(popup, {
      opacity: 0,
      delay: 0.2
    });

    setTimeout(function() {
      popup.style.visibility = "hidden";
    }, 400);

    group.children.forEach((mesh) => {

      if(mesh.material.opacity !== 0.4) {
        gsap.to(mesh.material, {
          opacity: 0.4,
          duration: 0.5
        });
      }
    });
  } else {
    group.children.forEach((mesh) => {

      if(intersectObjects.indexOf(mesh) !== -1)
      {
        gsap.to(mesh.material, {
          opacity: 1,
          duration: 0.3
        });

        popup.style.visibility = "visible";
        gsap.set(popup, {
          opacity: 1
        });

        popupText.innerHTML = mesh.country;
      } else {

        if(mesh.material.opacity !== 0.4) {
          gsap.to(mesh.material, {
            opacity: 0.4,
            duration: 0.5
          });
        }
      }
    });
  }

  renderer.render(scene, camera);
}

animate();

let shift = {
  x: (document.body.clientWidth - 2 * renderer.domElement.getBoundingClientRect().width),
  y: (document.body.clientHeight - 2 * renderer.domElement.getBoundingClientRect().height)
}

canvasContainer.addEventListener('mousedown', ({clientX, clientY}) => {

  const doesIntersect = raycaster.intersectObject(sphere);
  if(doesIntersect.length > 0)
    mouse.down = true;

  mouse.xPrev = clientX;
  mouse.yPrev = clientY;
});

addEventListener('mousemove', (event) => {

  mouse.x = ((event.clientX - renderer.domElement.getBoundingClientRect().width - shift.x) / (renderer.domElement.getBoundingClientRect().width)) * 2 - 1;
  mouse.y = -((event.clientY - renderer.domElement.getBoundingClientRect().height - shift.y) / (renderer.domElement.getBoundingClientRect().height)) * 2 + 1;

  gsap.to(popup, {
    x: event.clientX,
    y: event.clientY,
    delay: 0.05,
    duration: 0.3,
    ease: "power3.out",
  });

  if(mouse.down) {
    event.preventDefault();

    const deltaX = event.clientX - mouse.xPrev;
    const deltaY = event.clientY - mouse.yPrev;

    group.rotation.offset.x += deltaX * 0.005;
    group.rotation.offset.y += deltaY * 0.005;

    gsap.to(group.rotation, {
      y: group.rotation.offset.x,
      x: group.rotation.offset.y,
      duration: 1,
      ease: "power3.out",
    });

    mouse.xPrev = event.clientX;
    mouse.yPrev = event.clientY;
  }
});

addEventListener('mouseup', (event) => {
  mouse.down = false;
});

addEventListener('resize', () => {
  renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);

  shift = {
    x: (document.body.clientWidth - 2 * renderer.domElement.getBoundingClientRect().width),
    y: (document.body.clientHeight - 2 * renderer.domElement.getBoundingClientRect().height)
  }

  camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.offsetWidth / canvasContainer.offsetHeight,
    0.1,
    1000
  );

  camera.position.z = 11;
});

addEventListener('touchmove', (event) => {

  event.clientX = event.touches[0].clientX;
  event.clientY = event.touches[0].clientY;

  const doesIntersect = raycaster.intersectObject(sphere);

  if(doesIntersect.length > 0) {
    mouse.down = true;
  }

  if(!mouse.down)
    return;  

  mouse.x = ((event.clientX - renderer.domElement.getBoundingClientRect().width - shift.x) / (renderer.domElement.getBoundingClientRect().width)) * 2 - 1;
  mouse.y = -((event.clientY - renderer.domElement.getBoundingClientRect().height - shift.y) / (renderer.domElement.getBoundingClientRect().height)) * 2 + 1;

  if(mouse.down) {
    event.preventDefault();

    gsap.to(popup, {
      x: event.clientX,
      y: event.clientY,
      delay: 0.05,
      duration: 0.3,
      ease: "power3.out",
    });

    const deltaX = event.clientX - mouse.xPrev;
    const deltaY = event.clientY - mouse.yPrev;

    group.rotation.offset.x += deltaX * 0.005;
    group.rotation.offset.y += deltaY * 0.005;

    gsap.to(group.rotation, {
      y: group.rotation.offset.x,
      x: group.rotation.offset.y,
      duration: 1,
      ease: "power3.out",
    });

    mouse.xPrev = event.clientX;
    mouse.yPrev = event.clientY;
  }
}, {passive: false});

addEventListener('touchend', (event) => {
  mouse.down = false;
});
