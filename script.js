import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


document.addEventListener("DOMContentLoaded", () => {
    // ============================================
    // 0. Three.js & Loader Logic
    // ============================================
    const loaderOverlay = document.getElementById('loaderOverlay');
    const canvas = document.getElementById('webgl-canvas');
    
    // Scene Setup
    const scene = new THREE.Scene();
    
    // Camera Setup
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 10000);
    // Initial camera position (static, like original site)
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    // Renderer Setup
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: false, // Desligado para ganhar MUITO FPS
        powerPreference: "high-performance", // Força o uso da GPU dedicada
        alpha: false // Como o fundo é preto, podemos desligar o alpha canal para otimização
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Limita a resolução da tela (dá um boost imenso em celulares e monitores 4k)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.physicallyCorrectLights = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // We remove HDRI because hdri.webp gives yellow/brown reflections.
    // Instead we rely on the DirectionalLight for pure white highlights.

    // Lights (Cinematic Setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Main white highlight
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight1.position.set(5, 10, 7.5);
    scene.add(dirLight1);

    // Subtle blueish rim light from left
    const dirLight2 = new THREE.DirectionalLight(0x4444ff, 3.0);
    dirLight2.position.set(-10, 5, -5);
    scene.add(dirLight2);

    // Red rim light from below (matches Akira theme)
    const dirLight3 = new THREE.DirectionalLight(0xff1111, 4.0);
    dirLight3.position.set(0, -10, 5);
    scene.add(dirLight3);

    // Load 3D Model
    let gltfModel = null;
    const gltfLoader = new GLTFLoader();
    
    gltfLoader.load(
        'public/a_regular_day_in_neo-tokyo-compressed.glb',
        (gltf) => {
            gltfModel = gltf.scene;
            scene.add(gltfModel);
            
            // Torna o objeto 3D preto, conforme aprovado antes (dá o visual dark)
            gltfModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.color.setHex(0x151515); // Escuro, mas retém textura/reflexo
                    child.material.roughness = 0.3;
                    child.material.metalness = 0.6;
                }
            });

            // Adjust position/scale
            gltfModel.scale.set(1, 1, 1);
            gltfModel.position.set(0, 0, 0); // A cidade fica perfeitamente centralizada na origem
            gltfModel.rotation.set(0, 0, 0); // Sem rotação, o modelo fica plano no chão

            // Hide loader with fade when model is completely loaded
            const preloaderText = document.getElementById("preloaderText");
            if (preloaderText) preloaderText.textContent = "100%";
            
            if (loaderOverlay) {
                setTimeout(() => {
                    loaderOverlay.style.transform = 'translateY(-100%)';
                    setTimeout(() => {
                        loaderOverlay.style.display = 'none';
                        if (typeof window.playHeroAnimations === 'function') {
                            window.playHeroAnimations();
                        }
                    }, 800); // 800ms to match CSS transform transition
                }, 500); // small delay to show 100%
            } else {
                if (typeof window.playHeroAnimations === 'function') window.playHeroAnimations();
            }

            // Animação exclusiva da terceira DIV
            const tl3d = gsap.timeline({
                scrollTrigger: {
                    trigger: "#model3dSequence",
                    scrub: 1.5,
                    start: "top top",
                    end: "bottom bottom",
                }
            });

            // Configura a câmera para começar beeeem longe e alto (visão panorâmica da cidade)
            camera.position.set(0, 120, 120); // Muito alto e recuado, para ver a cidade toda espalhada
            camera.lookAt(0, 0, 0);

            // 1) A câmera dá um rasante, descendo e voando para a frente (sobrevoando os prédios)
            tl3d.to(camera.position, {
                x: 0,
                y: 15, // Desce até o nível dos prédios
                z: 45, // Voa para a frente, mas ainda mantendo distância da pílula
                duration: 4,
                ease: "power2.out",
                onUpdate: () => camera.lookAt(0, 0, 0) // Mantém a câmera olhando para o horizonte da cidade
            });

            // Pausa (3s) para admirar a cidade centralizada
            tl3d.to({}, { duration: 3 });
            
            // 2) Mergulha em direção à pílula, mas para a uma distância segura
            tl3d.to(camera.position, {
                y: 2, // Fica um pouco acima do chão
                z: 5, // Para antes de entrar na pílula
                duration: 6,
                ease: "power2.inOut", // Desacelera suavemente ao chegar
                onUpdate: () => camera.lookAt(0, 0, 0)
            });
        },
        (progress) => {
            const preloaderText = document.getElementById("preloaderText");
            if (preloaderText) {
                if (progress.total > 0) {
                    const percent = Math.floor((progress.loaded / progress.total) * 100);
                    preloaderText.textContent = `${percent}%`;
                } else {
                    // Fallback if content-length is missing
                    preloaderText.textContent = "Loading...";
                }
            }
        },
        (error) => {
            console.error('Error loading 3D model:', error);
            // Hide loader anyway to not block the site
            if (loaderOverlay) {
                loaderOverlay.style.transform = 'translateY(-100%)';
                setTimeout(() => {
                    loaderOverlay.style.display = 'none';
                    if (typeof window.playHeroAnimations === 'function') window.playHeroAnimations();
                }, 800); // 800ms to match CSS transform transition
            } else {
                if (typeof window.playHeroAnimations === 'function') window.playHeroAnimations();
            }
        }
    );

    // Render Loop
    const clock = new THREE.Clock();
    function animate3D() {
        requestAnimationFrame(animate3D);
        // Roda a cidade/pílula continuamente e bem devagar
        if (gltfModel) {
            gltfModel.rotation.y -= 0.002;
        }
        renderer.render(scene, camera);
    }
    animate3D();

    // Window Resize handling
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 1. Lenis Smooth Scroll
    // ============================================
    const lenis = new Lenis({
        lerp: 0.1,
        wheelMultiplier: 1.0,
    });


    // ============================================
    // 2. Animação 3D com GSAP
    // ============================================
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time)=>{ lenis.raf(time * 1000) });
    gsap.ticker.lagSmoothing(0);


    // ============================================
    // 3. Hero Animations (Entrada e barras invertidas)
    // ============================================
    setTimeout(() => {
        document.querySelector('.textContent')?.classList.add('visible');
    }, 100);
    window.playHeroAnimations = function() {
        document.querySelector('.textContent')?.classList.add('visible');
        
        // Custom text reveal removed per user request
    };

    // Hero Wipe (Barras pretas abrindo ao scrolar)
    const transitionBars = document.querySelectorAll('.transition div');
    if (transitionBars.length > 0) {
        const tlTransitionHero = gsap.timeline({
            scrollTrigger: {
                trigger: ".hero-wrapper",
                pinSpacing: false,
                start: "top top",
                end: "+=1500",
                scrub: 1
            }
        });
        tlTransitionHero.to(transitionBars, {
            height: "100%",
            stagger: 0.05,
        });
    }

    // ============================================
    // 4. Textos 3D (Scroll)
    // ============================================
    const config = {
        stagger: { each: 0.3, from: "random" },
        duration: 0.8,
        blur: "20px",
        pauseEntre: 18
    };

    // Função para simular o SplitText quebrando o texto em caracteres, mas mantendo a estrutura (ex: <br>)
    function customSplitText(selector) {
        const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];
        const result = [];
        
        elements.forEach(el => {
            const chars = [];
            const childNodes = Array.from(el.childNodes);
            el.innerHTML = "";
            
            childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    // Divide mantendo os espaços para que possamos restaurá-los
                    const words = text.split(/(\s+)/);
                    words.forEach(word => {
                        if (word.trim().length === 0) {
                            // É espaço ou quebra de linha do código fonte, adiciona como texto puro
                            if (word.length > 0) {
                                el.appendChild(document.createTextNode(word));
                            }
                        } else {
                            const wordSpan = document.createElement("span");
                            wordSpan.style.display = "inline-block";
                            wordSpan.style.whiteSpace = "pre";
                            
                            word.split("").forEach(char => {
                                const charSpan = document.createElement("span");
                                charSpan.className = "char";
                                charSpan.style.display = "inline-block";
                                charSpan.textContent = char;
                                wordSpan.appendChild(charSpan);
                                chars.push(charSpan);
                            });
                            
                            el.appendChild(wordSpan);
                        }
                    });
                } else if (node.nodeName.toLowerCase() === 'br') {
                    // Mantém a tag <br> intacta
                    el.appendChild(document.createElement("br"));
                } else {
                    // Outros elementos HTML, apenas copia
                    el.appendChild(node.cloneNode(true));
                }
            });
            
            result.push({ chars: chars });
        });
        
        return result.length === 1 ? result[0] : result;
    }
    // 4.1. Textos da Tela Preta (Intro Sequence)
    const textLayersIntro = document.querySelectorAll('.textSequenceContainer .textLayer .text');
    document.querySelectorAll('.textSequenceContainer .textLayer').forEach(layer => {
        layer.style.opacity = 1; 
        layer.style.maskImage = 'none';
        layer.style.webkitMaskImage = 'none';
    });
    const splitsIntro = Array.from(textLayersIntro).map(h2 => customSplitText(h2));
    const tlTextos3d = gsap.timeline({
        scrollTrigger: {
            trigger: "#textSequence",
            start: "top top",
            end: "bottom bottom",
            scrub: 2,
        }
    });
    tlTextos3d.to({}, { duration: 15 });
    splitsIntro.forEach((split) => {
        gsap.set(split.chars, { opacity: 0, filter: `blur(${config.blur})` });
        tlTextos3d.to(split.chars, { opacity: 1, filter: `blur(0px)`, duration: config.duration, stagger: config.stagger });
        tlTextos3d.to({}, { duration: config.pauseEntre });
        tlTextos3d.to(split.chars, { opacity: 0, filter: `blur(${config.blur})`, duration: config.duration, stagger: config.stagger });
    });
    tlTextos3d.to({}, { duration: 10 });

    // 4.2. Novos Textos Sobrepostos no 3D (Akira Themed Overlay)
    const textLayers3D = document.querySelectorAll('.model3dContainer .textLayer3d .text');
    document.querySelectorAll('.model3dContainer .textLayer3d').forEach(layer => {
        layer.style.opacity = 1; 
    });
    const splits3D = Array.from(textLayers3D).map(h2 => customSplitText(h2));
    const tlTextosOverlay3D = gsap.timeline({
        scrollTrigger: {
            trigger: "#model3dSequence",
            start: "top top",
            end: "bottom bottom",
            scrub: 2,
        }
    });
    
    const config3D = {
        stagger: { each: 0.2, from: "random" },
        duration: 0.8,
        blur: "20px",
        pauseEntre: 10
    };
    
    tlTextosOverlay3D.to({}, { duration: 8 });
    
    splits3D.forEach((split) => {
        gsap.set(split.chars, { opacity: 0, filter: `blur(${config3D.blur})` });
        tlTextosOverlay3D.to(split.chars, { opacity: 1, filter: `blur(0px)`, duration: config3D.duration, stagger: config3D.stagger });
        tlTextosOverlay3D.to({}, { duration: config3D.pauseEntre });
        tlTextosOverlay3D.to(split.chars, { opacity: 0, filter: `blur(${config3D.blur})`, duration: config3D.duration, stagger: config3D.stagger });
    });
    tlTextosOverlay3D.to({}, { duration: 5 });

    // ============================================
    // 6. Trailer no 3D — Texto surge + Pílula abre e revela vídeo
    // ============================================
    const pillSection = document.getElementById('trailerPillSection');
    if (pillSection) {
        // 6a. Texto que surge ao rolar (estilo do projeto original)
        const revealText = document.querySelector(".revealText");
        // const splitReveal = revealText ? customSplitText(revealText) : null;
        const splitReveal = null;
        // Fix the array issue to grab characters
        const revealChars = splitReveal ? (Array.isArray(splitReveal) ? (splitReveal[0]?.chars || []) : (splitReveal.chars || [])) : [];
        if (revealChars.length > 0) {
            gsap.set(revealChars, { y: "100%", opacity: 0 });
        }

        // 6b. Pílula aparece e seരുവ revelando o vídeo
        const tlPill = gsap.timeline({
            scrollTrigger: {
                trigger: ".trailer-wrapper",
                start: "top top",
                end: "+=1500",
                scrub: 1,
                pinSpacing: false
            }
        });

        if (revealChars.length > 0) {
            tlPill.to(revealChars, {
                y: "0%",
                opacity: 1,
                duration: 0.8,
                stagger: 0.03,
                ease: "power2.out"
            });
        }

        // Apenas surge o contêiner final suavemente
        tlPill.fromTo(".videoPillContainer", 
            { y: "100px", opacity: 0 },
            { y: "0px", opacity: 1, duration: 1, ease: "power2.out" },
            "-=0.5"
        );

        // Pausa para o usuário assistir
        tlPill.to({}, { duration: 3 });
    }

    // ============================================
    // 7. Efeito de Iluminação nos Cards (Mousemove)
    // ============================================
    const ondeAssistirGrid = document.querySelector('.ondeAssistirGrid');
    const cards = document.querySelectorAll('.ondeAssistirCard');
    
    if (ondeAssistirGrid) {
        ondeAssistirGrid.addEventListener('mousemove', (e) => {
            for (const card of cards) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        });
    }

});
