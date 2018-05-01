var container, stats;
var camera, controls, scene, renderer, vec, selected, geometry, planeY, height;
var raycaster, mouse = false;
var objects = [];
var ground = [];
var dragControls = false;
var objectDeleted = false;

Physijs.scripts.worker = 'three/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

init();
animate();
function init() {
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    var pushDOM = document.getElementById( 'pushMode' );
    
    vec = new THREE.Vector3;
    pushMode = false;
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 200 );
    camera.position.set( 0, 3, 50 );
    
    scene = new Physijs.Scene();
    scene.background = new THREE.Color( 0x4085E8 );
    scene.add( new THREE.AmbientLight( 0x555555 ) );
    light = new THREE.DirectionalLight( 0xdfebff, 1 );
    light.position.set( 1, 4, 2 );
    light.position.multiplyScalar( 1.3 );
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    var d = 40;
    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;
    light.shadow.camera.far = 40;
    light.shadow.camera.near = -40;
    scene.add( light );
    
    height = 3;
    geometry = new THREE.BoxGeometry( 2, height, 0.3 );
    
    // ground
    var loader = new THREE.TextureLoader();
    var groundTexture = loader.load( 'textures/hardwood.jpg' );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 5, 5 );
    groundTexture.anisotropy = 16;
    var groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );
    var mesh = new Physijs.BoxMesh( new THREE.PlaneBufferGeometry( 60, 60 ), groundMaterial );
    planeY = -5;
    mesh.position.y =  planeY;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add( mesh );
    ground.push(mesh);
    
    randomDominoes();
    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild( renderer.domElement );
    
    // controls
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minDistance = 20;
    controls.maxDistance = 100;
    dragControls = new THREE.DragControls( objects, camera, renderer.domElement );
    selected = null;
    dragControls.addEventListener( 'dragstart', function ( event ) {
        selected = event.object;
        controls.enabled = false;
                                  
        // freeze object
    vec.set( 0, 0, 0 );
    event.object.setLinearVelocity( vec );
    event.object.setLinearFactor(vec);
    event.object.setAngularVelocity( vec );
    event.object.setAngularFactor(vec);
    } );
    dragControls.addEventListener( 'drag', function ( event ) {
        event.object.__dirtyPosition = true;

        // limit drag through floor
        var offset = Math.abs(height/2*(Math.cos(event.object.rotation.x)+0.01));

        if(event.object.position.y < planeY + offset )
            event.object.position.y = planeY + offset;
    } );
    dragControls.addEventListener( 'dragend', function ( event ) {
        selected = null;
        controls.enabled = true;

        // unfreeze object
        vec.set( 1, 1, 1 );
        if( !objectDeleted ) {
            event.object.setAngularFactor(vec);
            event.object.setLinearFactor(vec);
        } else {
            objectDeleted = false;
        }
        if(pushMode)
            event.object.setLinearVelocity( camera.getWorldDirection().multiplyScalar(3) );
    } );
    
    var info = document.createElement( 'div' );
    info.style.position = 'absolute';
    info.style.top = '10px';
    info.style.width = '100%';
    info.style.textAlign = 'center';
    container.appendChild( info );
    stats = new Stats();
    container.appendChild( stats.dom );
    
    window.onkeydown = function( event ) {
        var key = String.fromCharCode(event.keyCode);
        if( selected ) {
            // rotate domino
            if( key == 'A' ) {
                vec.set( 0, 1.5, 0 );
                selected.setAngularVelocity( vec );
            }
            else if( key == 'D' ) {
                vec.set( 0, -1.5, 0 );
                selected.setAngularVelocity( vec );
            } else if( key == 'X' ) {
                //delete domino selected
                objectDeleted = true;
                scene.remove(selected);
                objects.splice(objects.indexOf(selected), 1);
            }
        }
        if( key == ' ') {
            pushMode = !pushMode;
            if(pushMode)
                pushDOM.innerHTML = "<br/><br/><br/><br/>Push Mode on";
            else
                pushDOM.innerHTML = "<br/><br/><br/><br/>Push Mode off";
        } else if ( key == 'Z' ) {
            // generate domino
            raycaster.setFromCamera( mouse, camera );
            var intersects = raycaster.intersectObjects( ground );
            if ( intersects.length > 0 ) {
                var intersect = intersects[ 0 ];
                var geometry = new THREE.BoxGeometry( 2, 3, 0.3 );
                var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
                object.position.copy( intersect.point )
                object.position.y = object.position.y + 2;
                object.castShadow = true;
                object.receiveShadow = true;
                scene.add( object );
                objects.push( object );
            }
        }
        else if( key == '1' )
            randomDominoes();
        else if( key == '2' )
            spiralDominoes();
        else if( key == '3' )
            stairDominoes();
    };
    
    // stop rotation
    window.onkeyup = function( event ) {
        if( selected ) {
            var key = String.fromCharCode(event.keyCode);
            if( key == 'A' || key == 'D' ) {
                vec.set( 0, 0, 0 );
                selected.setAngularVelocity( vec );
            }
        }
    };
    //track mouse
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    window.addEventListener( 'resize', onWindowResize, false );
}

function clear() {
    for( var i = objects.length - 1; i >= 0; i-- ) {
        scene.remove( objects[i] );
        objects.pop();
    }
}

function randomDominoes() {
    clear();
    for ( var i = 0; i < 10; i ++ ) {
        var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = Math.random() * 20 - 10;
        object.position.y = Math.random() * 12 - 2;
        object.position.z = Math.random() * 16 - 8;
        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        objects.push( object );
    }
}

function spiralDominoes() {
    clear();
    for ( var i = 0; i < 15; i += 0.15) {
        var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = 20*Math.cos(i) *(20-i)/20;
        object.position.y = 1;
        object.position.z = 20*Math.sin(i) *(20-i)/20;
        object.rotation.y = -i;
        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        objects.push( object );
    }
}

function stairDominoes() {
    clear();
    // before stairs
    for ( var i = 0; i < 6; i ++) {
        var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = 0;
        object.position.y = planeY+height/2;
        object.position.z = 16-2*i;
        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        objects.push( object );
    }
    
    // stairs
    for ( var i = 3; i <= 12; i += 3) {
        for ( var j = 0; j < i; j ++) {
            var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
            object.position.x = 0;
            object.position.y = planeY+j*0.3;
            object.position.z = 6-i/1.5;
            object.rotation.x = Math.PI/2;
            object.rotation.z = Math.PI/2;
            object.castShadow = true;
            object.receiveShadow = true;
            scene.add( object );
            objects.push( object );
        }
        // standing domino
        var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = 0;
        object.position.y = planeY+i*0.3+height/2;
        object.position.z = 6-i/1.5;
        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        objects.push( object );
    }
    // after stairs
    for ( var i = 0; i < 6; i ++) {
        var object = new Physijs.BoxMesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = 0;
        object.position.y = planeY+height/2;
        object.position.z = -2*i-7;
        object.castShadow = true;
        object.receiveShadow = true;
        scene.add( object );
        objects.push( object );
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
    requestAnimationFrame( animate );
    scene.simulate(); // run physics
    render();
    stats.update();
}
function render() {
    controls.update();
    renderer.render( scene, camera );
}
