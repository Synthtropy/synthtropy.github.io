// Initialize WebGL shader
(function() {
    // Define fragment shader as a string
    const fragmentShaderSource = `
        precision mediump float;
        
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_aspectRatio;
        uniform sampler2D u_texture;
        
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
        
        // Random function for glitch effect
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // MPEG-style pixelation glitch effect
        vec3 applyMpegGlitch(vec2 uv, vec3 color, float time) {
            vec3 glitchColor = color;
            
            float glitchTrigger = step(0.96, sin(time * 0.5) * 0.5 + 0.5);
            float macroblockTrigger = step(0.7, random(vec2(floor(time * 4.0))));
            
            if (macroblockTrigger > 0.5) {
                float blockSize = 8.0 + floor(random(vec2(floor(time * 2.0))) * 24.0);
                vec2 blockUV = floor(uv * u_resolution.xy / blockSize) * blockSize / u_resolution.xy;
                vec2 blockPos = blockUV * u_resolution.xy;
                float blockNoise = random(vec2(blockUV + time * 0.1));
                
                float rowTrigger = step(0.7, random(vec2(floor(blockUV.y * 30.0), time)));
                
                if (rowTrigger > 0.5) {
                    float xOffset = (random(vec2(blockUV.y, time)) * 2.0 - 1.0) * 0.02;
                    blockUV.x += xOffset * glitchTrigger;
                    
                    float colorShift = random(blockUV + time);
                    glitchColor.r = mix(color.r, color.g, colorShift * 0.2 * rowTrigger);
                    glitchColor.b = mix(color.b, color.r, colorShift * 0.1 * rowTrigger);
                }
                
                float edgeArtifact = step(0.8, random(vec2(blockUV.y, time)));
                if (edgeArtifact > 0.5 && rowTrigger > 0.5) {
                    float edgeIntensity = random(blockUV + time) * 0.5;
                    glitchColor += vec3(edgeIntensity, edgeIntensity * 0.8, edgeIntensity * 0.9) * rowTrigger;
                }
            }
            
            float blockingArtifact = step(0.92, random(vec2(floor(uv.y * 20.0), floor(time * 3.0))));
            if (blockingArtifact > 0.5 && glitchTrigger > 0.5) {
                vec3 corruptedColor = vec3(
                    step(0.5, random(vec2(floor(uv.y * 40.0), time))),
                    step(0.5, random(vec2(floor(uv.y * 40.0), time + 1.0))),
                    step(0.5, random(vec2(floor(uv.y * 40.0), time + 2.0)))
                );
                
                if (step(0.8, random(vec2(floor(uv.y * 40.0), time))) > 0.5) {
                    corruptedColor = vec3(1.0, 0.2, 0.8);
                } else if (step(0.7, random(vec2(floor(uv.y * 40.0), time + 3.0))) > 0.5) {
                    corruptedColor = vec3(0.2, 1.0, 0.5);
                }
                
                glitchColor = mix(glitchColor, corruptedColor, blockingArtifact * glitchTrigger);
                
                float tearEffect = step(0.4, sin(uv.y * 100.0 + time * 10.0));
                float tearOffset = (random(vec2(floor(uv.y * 30.0), time)) * 2.0 - 1.0) * 0.03;
                
                if (step(0.6, random(vec2(floor(uv.y * 20.0), floor(time)))) > 0.5) {
                    glitchColor.r = mix(glitchColor.r, random(vec2(uv.x + tearOffset, uv.y)), tearEffect * 0.8 * blockingArtifact);
                    glitchColor.g = mix(glitchColor.g, random(vec2(uv.x, uv.y)), tearEffect * 0.8 * blockingArtifact);
                    glitchColor.b = mix(glitchColor.b, random(vec2(uv.x - tearOffset, uv.y)), tearEffect * 0.8 * blockingArtifact);
                }
            }
            
            float scanline = sin(uv.y * u_resolution.y * 0.5) * 0.5 + 0.5;
            glitchColor = mix(glitchColor, glitchColor * (0.9 + 0.1 * scanline), 0.1);
            
            return glitchColor;
        }
        
        void main() {
            vec2 position = gl_FragCoord.xy;
            vec2 uv = position / u_resolution.xy;
            
            float p1 = plasma(position * 0.8, u_time * 0.5);
            float p2 = plasma(position * 1.2, u_time * 0.7 + 1.0);
            float p3 = plasma(position * 0.5, u_time * 0.3 - 2.0);
            
            float bubbleEffect = (p1 * 0.5 + p2 * 0.3 + p3 * 0.2);
            
            // Base color with alpha for background
            vec4 baseColor = vec4(0.01, 0.0, 0.05, 0.8); 
            
            // Initialize with transparent base 
            vec4 color = baseColor;
            
            vec2 uvVig = gl_FragCoord.xy / u_resolution.xy;
            float vig = 1.0 - pow(abs(uvVig.x - 0.5) * 1.2, 2.0) - pow(abs(uvVig.y - 0.5) * 1.2, 2.0);
            vig = pow(vig, 0.3) * 0.7 + 0.3;
            color.rgb *= mix(1.0, vig, 0.6);

            
        
            
            // float lineThickness = 0.004;
            // float staffHeight2 = lineSpacing * 4.0;
            // float firstLineY = centerY - staffHeight2 / 2.0;
            
            // float lineIntensity = 0.0;
            // for (int i = 0; i < 5; i++) {
            //     float lineY = firstLineY + float(i) * lineSpacing;
            //     lineIntensity += drawLine(uv, lineY, lineThickness);
            // }
            
            // // Lines with full opacity
            // vec4 lineColor = vec4(1.0, 1.0, 1.0, 0.2);
            // color = mix(color, lineColor, min(lineIntensity, 0.7));
            
            // Apply glitch effect while preserving alpha where appropriate
            vec3 glitchedRgb = applyMpegGlitch(uv, color.rgb, u_time);
            color = vec4(glitchedRgb, color.a);
            
            gl_FragColor = color;
        }
    `;

    const canvas = document.getElementById('shader-canvas');
    // Create WebGL context with alpha support
    const gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true
    });
    
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }
    
    const dummyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 
        0, 
        gl.RGBA, 
        1, 
        1, 
        0, 
        gl.RGBA, 
        gl.UNSIGNED_BYTE, 
        new Uint8Array([0, 0, 0, 255])
    );
    
    function resizeCanvas() {
        const blackArea = document.querySelector('.black-area');
        if (blackArea) {
            canvas.width = blackArea.offsetWidth;
            canvas.height = blackArea.offsetHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            
            if (canvas.height > 0) {
                aspectRatio = canvas.width / canvas.height;
                gl.uniform1f(aspectRatioLocation, aspectRatio);
            }
        }
    }
    
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100);
    
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
    
    const vertexShaderSource = document.getElementById('vertex-shader').textContent;
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
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    const positions = [
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const aspectRatioLocation = gl.getUniformLocation(program, 'u_aspectRatio');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    let aspectRatio = 1.0;
    if (canvas.width > 0 && canvas.height > 0) {
        aspectRatio = canvas.width / canvas.height;
    }
    gl.uniform1f(aspectRatioLocation, aspectRatio);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
    gl.uniform1i(textureLocation, 0);
    
    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    let startTime = Date.now();
    
    function render() {
        // Clear with transparent black
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        const currentTime = (Date.now() - startTime) / 1000;
        gl.uniform1f(timeLocation, currentTime);
        
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform1f(aspectRatioLocation, aspectRatio);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(render);
    }
    
    render();

    if (window.ResizeObserver) {
        const blackArea = document.querySelector('.black-area');
        const resizeObserver = new ResizeObserver(entries => {
            resizeCanvas();
        });
        if (blackArea) resizeObserver.observe(blackArea);
    }
})();
