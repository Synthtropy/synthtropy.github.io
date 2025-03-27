// Initialize WebGL shader
(function() {
    // Define fragment shader as a string
    const fragmentShaderSource = `
        precision mediump float;
        
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_aspectRatio;
        
        // Function to create plasma-like effect
        float plasma(vec2 position, float time) {
            vec2 pos = position / u_resolution.xy;
            float v1 = sin(pos.x * 8.0 + time);
            float v2 = sin(pos.y * 8.0 + time);
            float v3 = sin(pos.x * 10.0 + pos.y * 10.0 + time);
            float v4 = sin(sqrt(pos.x * pos.x * 0.5 + pos.y * pos.y * 0.5) * 10.0 + time);
            
            return (v1 + v2 + v3 + v4) * 0.25 + 0.5;
        }
        
        // Function to draw a line with antialiasing
        float drawLine(vec2 uv, float y, float thickness) {
            float dist = abs(uv.y - y);
            return 1.0 - smoothstep(0.0, thickness, dist);
        }
        
        void main() {
            vec2 position = gl_FragCoord.xy;
            vec2 uv = position / u_resolution.xy;
            
            // Create multiple plasma layers for bubble effect
            float p1 = plasma(position * 0.8, u_time * 0.5);
            float p2 = plasma(position * 1.2, u_time * 0.7 + 1.0);
            float p3 = plasma(position * 0.5, u_time * 0.3 - 2.0);
            
            // Combine layers for bubble effect with less circular pattern
            float bubbleEffect = (p1 * 0.5 + p2 * 0.3 + p3 * 0.2);
            
            
            vec3 color = mix(vec3(0.15, 0.0, 0.15), vec3(0.0), bubbleEffect);
            
            // Add some depth and bubble-like highlights
            float highlight = pow(bubbleEffect, 3.0) * 0.3;
            color += vec3(highlight * 0.5, highlight * 0.9, highlight * 0.5);
            
            // Apply a much softer vignette effect to prevent circular shape
            vec2 uvVig = gl_FragCoord.xy / u_resolution.xy;
            float vig = 1.0 - pow(abs(uvVig.x - 0.5) * 1.2, 2.0) - pow(abs(uvVig.y - 0.5) * 1.2, 2.0);
            vig = pow(vig, 0.3) * 0.7 + 0.3; // Softer falloff and higher minimum
            
            // Apply less vignette effect to maintain more rectangle filling
            color *= mix(1.0, vig, 0.6);
            
            // Add sheet music lines (5 horizontal lines)
            float lineSpacing = 0.1; // Space between lines
            float lineThickness = 0.006; // Line thickness
            float centerY = 0.5; // Center position for the staff
            float staffHeight = lineSpacing * 4.0; // Total height of the staff (5 lines = 4 spaces)
            
            // Calculate the y position for the first line
            float firstLineY = centerY - staffHeight / 2.0;
            
            // Draw the 5 lines
            float lineIntensity = 0.0;
            for (int i = 0; i < 5; i++) {
                float lineY = firstLineY + float(i) * lineSpacing;
                lineIntensity += drawLine(uv, lineY, lineThickness);
            }
            
            // Add lines to the final color (make them slightly lighter than the background)
            vec3 lineColor = vec3(0.5, 0.3, 0.5);
            color = mix(color, lineColor, min(lineIntensity, 0.7));
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const canvas = document.getElementById('shader-canvas');
    const gl = canvas.getContext('webgl');
    
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }
    
    // Resize canvas to match the black area dimensions
    function resizeCanvas() {
        const blackArea = document.querySelector('.black-area');
        if (blackArea) {
            canvas.width = blackArea.offsetWidth;
            canvas.height = blackArea.offsetHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            
            // Update aspect ratio when canvas is resized
            if (canvas.height > 0) {
                aspectRatio = canvas.width / canvas.height;
                gl.uniform1f(aspectRatioLocation, aspectRatio);
            }
        }
    }
    
    window.addEventListener('resize', resizeCanvas);
    
    // Slight delay to ensure the black area dimensions are correct
    setTimeout(resizeCanvas, 100);
    
    // Compile shader
    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    // Create shader program
    const vertexShaderSource = document.getElementById('vertex-shader').textContent;
    // We're now using the fragmentShaderSource string defined above instead of getting it from the DOM
    
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return;
    }
    
    gl.useProgram(program);
    
    // Create a buffer for the rectangle
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Two triangles forming a rectangle
    const positions = [
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Set up attributes and uniforms
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const aspectRatioLocation = gl.getUniformLocation(program, 'u_aspectRatio');
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Calculate and set initial aspect ratio
    let aspectRatio = 1.0;
    if (canvas.width > 0 && canvas.height > 0) {
        aspectRatio = canvas.width / canvas.height;
    }
    gl.uniform1f(aspectRatioLocation, aspectRatio);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    
    // Animation loop
    let startTime = Date.now();
    
    function render() {
        const currentTime = (Date.now() - startTime) / 1000; // Convert to seconds
        gl.uniform1f(timeLocation, currentTime);
        
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        // Ensure aspect ratio is set each frame in case of dynamic changes
        gl.uniform1f(aspectRatioLocation, aspectRatio);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(render);
    }
    
    render();

    // Add resize observer for more responsive canvas resizing
    if (window.ResizeObserver) {
        const blackArea = document.querySelector('.black-area');
        const resizeObserver = new ResizeObserver(entries => {
            resizeCanvas();
        });
        if (blackArea) resizeObserver.observe(blackArea);
    }
})();
