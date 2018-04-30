(function () {
    var allCubes = [];
    var lastCube;
    var isMoving = false;

    var scene, camera, renderer, raycaster, orbitControl, domEvents;
    var moveAxis, moveDirection, clickVector, clickFace;

    var mouse = new THREE.Vector2();
    var pivot = new THREE.Object3D();

    var moves = [];
    var activeGroup = [];

    function init() {
        var canvas = $("#scene").empty();
        var width = canvas.innerWidth();
        var height = canvas.innerHeight();

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor(configuration.backgroundColor, 1.0);
        renderer.setSize(width, height);
        canvas.append(renderer.domElement);
        domEvents = new THREEx.DomEvents(camera, renderer.domElement);
        camera.position.set(-20, 20, 20);
        camera.lookAt(scene.position);
        orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
        raycaster = new THREE.Raycaster();

        createCubes();
        bindEvents();
        $("#scramble").on('click', mixCube);
    }
	
	var configuration = {
		cubeSize: 3,
		spacing: 0.2,
		rotationSpeed: 0.2,
		colours: [0x0000FF, 0x008000, 0xFFFF00, 0xFFA500, 0xFF0000, 0xFFFFFF],
		transitions: {
			x: {z: 'y', y: 'z'},
			y: {z: 'x', x: 'z'},
			z: {x: 'y', y: 'x'}
		},
		backgroundColor: 0x696969
};
	
	// Functions 
	
	function nearlyEqual(a, b) {
		return Math.abs(a - b) <= 0.001;
	}

	function degreesToRadians(degrees) {
		return degrees * Math.PI / 180;
	}


	function randomInt(value) {
		return Math.floor(Math.random() * value);
	}

	function randomDirection() {
		var x = randomInt(2);
		return (x == 0) ? -1 : x;
	}

    // CUBE OBJECTS

    var Cube = function (x, y, z) {
        var cubeGeometry = new THREE.BoxGeometry(configuration.cubeSize, configuration.cubeSize, configuration.cubeSize);
        var cubeMaterials = new THREE.MeshLambertMaterial(configuration.cubeColour);
         var fr=5;
        this.x = x;
        this.y = y;
        this.z = z;

        this.cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
        this.cube.position.set(x, y, z);

        this.createPlanes();

        domEvents.addEventListener(this.cube, 'mouseout', function (e) {
            lastCube = e.target;
        }, false);

        return this.cube;
    };


    Cube.prototype.createPlanes = function () {
        var offset = (configuration.cubeSize / 2) + 0.1;
        var increment = configuration.cubeSize + configuration.spacing;

        if (this.x == increment)
            newPlane(this.cube, this.x + offset, this.y, this.z, configuration.colours[0], this.y, 90);
        if (this.x == -increment)
            newPlane(this.cube, this.x - offset, this.y, this.z, configuration.colours[1], this.y, -90);
        if (this.y == increment)
            newPlane(this.cube, this.x, this.y + offset, this.z, configuration.colours[2], this.x, -90);
        if (this.y == -increment)
            newPlane(this.cube, this.x, this.y - offset, this.z, configuration.colours[3], this.x, 90);
        if (this.z == increment)
            newPlane(this.cube, this.x, this.y, this.z + offset, configuration.colours[4]);
        if (this.z == -increment)
            newPlane(this.cube, this.x, this.y, this.z - offset, configuration.colours[5], this.y, -180);
    };

    function newPlane(cube, x, y, z, colour, axis, degrees) {
        var geometry = new THREE.PlaneGeometry(configuration.cubeSize-0.3, configuration.cubeSize-0.3, configuration.cubeSize-0.3);
        var material = new THREE.MeshLambertMaterial({color: colour, emissive: colour});
        var plane = new THREE.Mesh(geometry, material);
        plane.position.set(x, y, z);
        cube.add(plane);

        cube.updateMatrixWorld();
        THREE.SceneUtils.attach(plane, scene, cube);

        if (axis == x)
            plane.rotation.set(degreesToRadians(degrees), 0, 0);
        else if (axis == y)
            plane.rotation.set(0, degreesToRadians(degrees), 0);
    }

    function createCubes() {
        var increment = configuration.cubeSize + configuration.spacing;
        var newCube;

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                for (var k = 0; k < 3; k++) {
                    newCube = new Cube((i - 1) * increment, (j - 1) * increment, (k - 1) * increment);
                    scene.add(newCube);
                    allCubes.push(newCube);
                }
            }
        }
    }

    // CUBE MOVES
	
	function setActiveCubes(axis) {
        activeGroup = [];
        allCubes.forEach(function (cube) {
            if (nearlyEqual(cube.position[axis], clickVector[axis])) {
                activeGroup.push(cube);
            }
        });
    }

    function startMove() {
        var nextMove = moves.pop();

        if (nextMove) {

            clickVector = nextMove.vector;

            if (!isMoving) {
                isMoving = true;

                moveAxis = nextMove.axis;
                moveDirection = nextMove.direction;
                setActiveCubes(nextMove.axis);

                pivot.rotation.set(0, 0, 0);
                pivot.updateMatrixWorld();
                scene.add(pivot);

                activeGroup.forEach(function (e) {
                    THREE.SceneUtils.attach(e, scene, pivot);
                });
            }
        }
    }

    function doMove() {

        if (pivot.rotation[moveAxis] >= Math.PI / 2) {
            pivot.rotation[moveAxis] = Math.PI / 2;
            moveComplete();
        } else if (pivot.rotation[moveAxis] <= Math.PI / -2) {
            pivot.rotation[moveAxis] = Math.PI / -2;
            moveComplete()
        } else {
            pivot.rotation[moveAxis] += ( moveDirection * configuration.rotationSpeed);
        }
    }

    function moveComplete() {
        isMoving = false;

        moveAxis = null;
        moveDirection = null;
        clickVector = null;

        pivot.updateMatrixWorld();
        scene.remove(pivot);

        activeGroup.forEach(function (cube) {
            THREE.SceneUtils.detach(cube, pivot, scene);
        });

        startMove();
    }

    function animate() {
        if (isMoving)
            doMove();
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    // CAMERA CONTROL

    function enableCameraControl() {
        orbitControl.noRotate = false;
    }

    function disableCameraControl() {
        orbitControl.noRotate = true;
    }

    // EVENTS
	
	function chooseAxis(dragVector) {
        var maxAxis = 'x';
        var max = Math.abs(dragVector.x);

        if (Math.abs(dragVector.y) > max) {
            max = Math.abs(dragVector.y);
            maxAxis = 'y';
        }

        if (Math.abs(dragVector.z) > max) {
            max = Math.abs(dragVector.z);
            maxAxis = 'z';
        }

        return maxAxis;
    }

    function transformCube(clickVector, axis, direction) {
        moves.push({vector: clickVector, axis: axis, direction: direction});
    }

    function bindEvents() {
        document.addEventListener('mousedown', onCubeMouseDown, false);
        document.addEventListener('mouseup', onCubeMouseUp, false);
        window.addEventListener('resize', onWindowResize, false);
    }

    function onCubeMouseDown(event) {
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        var intersects = raycaster.intersectObjects(allCubes);
        var maxExtent = (configuration.cubeSize * 3 + configuration.spacing * 2) / 2;

        if (intersects.length > 0) {
            disableCameraControl();

            var face = intersects[0].point;
            clickVector = intersects[0].object.position.clone();

            if (nearlyEqual(Math.abs(face.x), maxExtent))
                clickFace = 'x';
            else if (nearlyEqual(Math.abs(face.y), maxExtent))
                clickFace = 'y';
            else if (nearlyEqual(Math.abs(face.z), maxExtent))
                clickFace = 'z';
        }
    }

    function onCubeMouseUp(event) {
        if (clickVector) {
            mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            var intersects = raycaster.intersectObjects(allCubes);

            if (intersects.length > 0) {
                var dragVector = intersects[0].object.position.clone();
            } else if (lastCube) {
                var dragVector = lastCube.position.clone();
            }

            dragVector.sub(clickVector);

            if (dragVector.length() > configuration.cubeSize) {
                dragVector[clickFace] = 0;

                var maxAxis = chooseAxis(dragVector);
                var rotateAxis = configuration.transitions[clickFace][maxAxis];
                var direction = dragVector[maxAxis] >= 0 ? 1 : -1;

				if (clickFace == 'z' && rotateAxis == 'x' ||
                    clickFace == 'x' && rotateAxis == 'z' ||
                    clickFace == 'y' && rotateAxis == 'z')
                    direction *= -1;

                if (clickFace == 'x' && clickVector.x > 0 ||
                    clickFace == 'y' && clickVector.y < 0 ||
                    clickFace == 'z' && clickVector.z < 0)
                    direction *= -1;

                transformCube(clickVector.clone(), rotateAxis, direction);
                startMove();
                enableCameraControl();
            }
        }
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
	
	function mixCube() {
        var axises = ['x', 'y', 'z'];

        for (var i = 0; i < 20; i++) {
            var cube = allCubes[randomInt(allCubes.length)];
            transformCube(cube.position.clone(), axises[randomInt(3)], randomDirection());
        }
        startMove();
    }

    $(document).ready(function () {
        init();
        animate();
    });

}());
