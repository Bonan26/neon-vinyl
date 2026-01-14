/**
 * LES WOLFS 86 - Wolf Mascot Component
 * Spine 2D style skeletal animation using GSAP
 * Premium idle animations with breathing, ear twitches, tail wags
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import './WolfMascot.css';

const WolfMascot = ({
  onBlowComplete,
  triggerBlow = false,
  triggerHowl = false,
  isWinning = false,
}) => {
  const containerRef = useRef(null);
  const bodyRef = useRef(null);
  const headRef = useRef(null);
  const earLeftRef = useRef(null);
  const earRightRef = useRef(null);
  const eyeLeftRef = useRef(null);
  const eyeRightRef = useRef(null);
  const muzzleRef = useRef(null);
  const jawRef = useRef(null);
  const tailRef = useRef(null);
  const frontLegRef = useRef(null);
  const backLegRef = useRef(null);
  const glowRef = useRef(null);
  const breathParticlesRef = useRef(null);

  const idleTimelineRef = useRef(null);
  const [isBlowing, setIsBlowing] = useState(false);
  const [isHowling, setIsHowling] = useState(false);

  // Idle animation - Spine 2D style breathing and subtle movements
  useEffect(() => {
    if (!bodyRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    // Body breathing - subtle rise and fall
    tl.to(bodyRef.current, {
      y: -3,
      scaleY: 1.02,
      scaleX: 0.99,
      duration: 2.5,
      ease: 'sine.inOut',
    }, 0);

    // Head follows body with slight delay, adds life
    tl.to(headRef.current, {
      y: -4,
      rotation: 1,
      duration: 2.5,
      ease: 'sine.inOut',
    }, 0.1);

    // Muzzle slight movement
    tl.to(muzzleRef.current, {
      y: -1,
      scaleY: 1.01,
      duration: 2.5,
      ease: 'sine.inOut',
    }, 0.15);

    idleTimelineRef.current = tl;

    return () => {
      tl.kill();
    };
  }, []);

  // Ear twitch animation - random intervals
  useEffect(() => {
    if (!earLeftRef.current || !earRightRef.current) return;

    const twitchEar = () => {
      const ear = Math.random() > 0.5 ? earLeftRef.current : earRightRef.current;
      const direction = Math.random() > 0.5 ? 1 : -1;

      gsap.timeline()
        .to(ear, {
          rotation: direction * 15,
          scaleY: 0.9,
          duration: 0.1,
          ease: 'power2.out',
        })
        .to(ear, {
          rotation: direction * -5,
          scaleY: 1.05,
          duration: 0.15,
          ease: 'elastic.out(1, 0.5)',
        })
        .to(ear, {
          rotation: 0,
          scaleY: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.6 && !isBlowing && !isHowling) {
        twitchEar();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isBlowing, isHowling]);

  // Tail wag animation - continuous subtle movement
  useEffect(() => {
    if (!tailRef.current) return;

    const tl = gsap.timeline({ repeat: -1 });

    tl.to(tailRef.current, {
      rotation: 8,
      duration: 0.8,
      ease: 'sine.inOut',
    })
    .to(tailRef.current, {
      rotation: -5,
      duration: 0.6,
      ease: 'sine.inOut',
    })
    .to(tailRef.current, {
      rotation: 10,
      duration: 0.7,
      ease: 'sine.inOut',
    })
    .to(tailRef.current, {
      rotation: -3,
      duration: 0.5,
      ease: 'sine.inOut',
    });

    return () => tl.kill();
  }, []);

  // Eye blink animation
  useEffect(() => {
    if (!eyeLeftRef.current || !eyeRightRef.current) return;

    const blink = () => {
      gsap.timeline()
        .to([eyeLeftRef.current, eyeRightRef.current], {
          scaleY: 0.1,
          duration: 0.08,
          ease: 'power2.in',
        })
        .to([eyeLeftRef.current, eyeRightRef.current], {
          scaleY: 1,
          duration: 0.12,
          ease: 'power2.out',
        });
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.7 && !isBlowing && !isHowling) {
        blink();
        // Sometimes double blink
        if (Math.random() > 0.7) {
          setTimeout(blink, 200);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isBlowing, isHowling]);

  // Leg subtle movement
  useEffect(() => {
    if (!frontLegRef.current || !backLegRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    tl.to(frontLegRef.current, {
      rotation: 2,
      y: -1,
      duration: 2,
      ease: 'sine.inOut',
    }, 0);

    tl.to(backLegRef.current, {
      rotation: -1,
      y: -1,
      duration: 2.2,
      ease: 'sine.inOut',
    }, 0.2);

    return () => tl.kill();
  }, []);

  // Blow animation (Wolf Burst)
  const playBlowAnimation = useCallback(() => {
    if (isBlowing) return;
    setIsBlowing(true);

    // Pause idle
    idleTimelineRef.current?.pause();

    const tl = gsap.timeline({
      onComplete: () => {
        setIsBlowing(false);
        idleTimelineRef.current?.resume();
        onBlowComplete?.();
      }
    });

    // Wind up - pull back
    tl.to(bodyRef.current, {
      x: 15,
      scaleX: 1.1,
      scaleY: 0.95,
      duration: 0.4,
      ease: 'power2.in',
    }, 0);

    tl.to(headRef.current, {
      x: 20,
      rotation: -10,
      duration: 0.4,
      ease: 'power2.in',
    }, 0);

    tl.to([earLeftRef.current, earRightRef.current], {
      rotation: -20,
      scaleY: 0.8,
      duration: 0.4,
      ease: 'power2.in',
    }, 0);

    tl.to(muzzleRef.current, {
      scaleX: 0.9,
      duration: 0.4,
      ease: 'power2.in',
    }, 0);

    // BLOW! - forward thrust
    tl.to(bodyRef.current, {
      x: -20,
      scaleX: 0.92,
      scaleY: 1.05,
      duration: 0.15,
      ease: 'power4.out',
    }, 0.45);

    tl.to(headRef.current, {
      x: -30,
      rotation: 5,
      duration: 0.15,
      ease: 'power4.out',
    }, 0.45);

    tl.to(muzzleRef.current, {
      scaleX: 1.3,
      scaleY: 1.1,
      duration: 0.15,
      ease: 'power4.out',
    }, 0.45);

    tl.to(jawRef.current, {
      rotation: 25,
      y: 5,
      duration: 0.15,
      ease: 'power4.out',
    }, 0.45);

    // Show breath particles
    tl.to(breathParticlesRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.1,
    }, 0.5);

    tl.to(breathParticlesRef.current, {
      x: -150,
      scale: 2,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
    }, 0.55);

    // Glow effect
    tl.to(glowRef.current, {
      opacity: 0.8,
      scale: 1.5,
      duration: 0.2,
      ease: 'power2.out',
    }, 0.45);

    tl.to(glowRef.current, {
      opacity: 0,
      scale: 1,
      duration: 0.5,
      ease: 'power2.in',
    }, 0.7);

    // Hold blow pose
    tl.to({}, { duration: 0.4 });

    // Recovery - return to idle
    tl.to(bodyRef.current, {
      x: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.5,
      ease: 'elastic.out(1, 0.7)',
    }, '+=0');

    tl.to(headRef.current, {
      x: 0,
      rotation: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.7)',
    }, '<');

    tl.to([earLeftRef.current, earRightRef.current], {
      rotation: 0,
      scaleY: 1,
      duration: 0.4,
      ease: 'elastic.out(1, 0.5)',
    }, '<');

    tl.to(muzzleRef.current, {
      scaleX: 1,
      scaleY: 1,
      duration: 0.4,
      ease: 'elastic.out(1, 0.7)',
    }, '<');

    tl.to(jawRef.current, {
      rotation: 0,
      y: 0,
      duration: 0.3,
      ease: 'power2.out',
    }, '<');

  }, [isBlowing, onBlowComplete]);

  // Howl animation
  const playHowlAnimation = useCallback(() => {
    if (isHowling) return;
    setIsHowling(true);
    idleTimelineRef.current?.pause();

    const tl = gsap.timeline({
      onComplete: () => {
        setIsHowling(false);
        idleTimelineRef.current?.resume();
      }
    });

    // Look up
    tl.to(headRef.current, {
      y: -20,
      rotation: -15,
      duration: 0.3,
      ease: 'power2.out',
    }, 0);

    tl.to(muzzleRef.current, {
      y: -10,
      rotation: -20,
      scaleY: 1.2,
      duration: 0.3,
      ease: 'power2.out',
    }, 0);

    tl.to(jawRef.current, {
      rotation: 35,
      y: 8,
      duration: 0.4,
      ease: 'power2.out',
    }, 0.1);

    tl.to([earLeftRef.current, earRightRef.current], {
      rotation: -25,
      scaleY: 0.85,
      duration: 0.3,
      ease: 'power2.out',
    }, 0);

    tl.to(bodyRef.current, {
      y: -5,
      scaleY: 1.05,
      duration: 0.3,
      ease: 'power2.out',
    }, 0);

    // Hold howl with subtle shake
    tl.to(headRef.current, {
      x: '+=3',
      duration: 0.1,
      ease: 'power1.inOut',
      repeat: 8,
      yoyo: true,
    }, 0.4);

    // Glow pulse
    tl.to(glowRef.current, {
      opacity: 0.6,
      scale: 1.8,
      duration: 0.3,
    }, 0.3);

    tl.to(glowRef.current, {
      opacity: 0.3,
      scale: 1.5,
      duration: 0.5,
      repeat: 2,
      yoyo: true,
    }, 0.6);

    // Recovery
    tl.to(headRef.current, {
      y: 0,
      x: 0,
      rotation: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.8)',
    }, '+=0.2');

    tl.to(muzzleRef.current, {
      y: 0,
      rotation: 0,
      scaleY: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, '<');

    tl.to(jawRef.current, {
      rotation: 0,
      y: 0,
      duration: 0.3,
      ease: 'power2.out',
    }, '<');

    tl.to([earLeftRef.current, earRightRef.current], {
      rotation: 0,
      scaleY: 1,
      duration: 0.4,
      ease: 'elastic.out(1, 0.5)',
    }, '<');

    tl.to(bodyRef.current, {
      y: 0,
      scaleY: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, '<');

    tl.to(glowRef.current, {
      opacity: 0,
      scale: 1,
      duration: 0.4,
    }, '<');

  }, [isHowling]);

  // Win celebration - excited animation
  useEffect(() => {
    if (!isWinning) return;

    // Excited tail wag
    gsap.to(tailRef.current, {
      rotation: 20,
      duration: 0.15,
      ease: 'power2.inOut',
      repeat: 6,
      yoyo: true,
    });

    // Happy bounce
    gsap.to(containerRef.current, {
      y: -10,
      duration: 0.2,
      ease: 'power2.out',
      repeat: 3,
      yoyo: true,
    });

    // Ears perk up
    gsap.to([earLeftRef.current, earRightRef.current], {
      rotation: 10,
      scaleY: 1.1,
      duration: 0.2,
      ease: 'power2.out',
    });

    // Return to normal after
    const timeout = setTimeout(() => {
      gsap.to([earLeftRef.current, earRightRef.current], {
        rotation: 0,
        scaleY: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isWinning]);

  // Trigger blow from props
  useEffect(() => {
    if (triggerBlow) {
      playBlowAnimation();
    }
  }, [triggerBlow, playBlowAnimation]);

  // Trigger howl from props
  useEffect(() => {
    if (triggerHowl) {
      playHowlAnimation();
    }
  }, [triggerHowl, playHowlAnimation]);

  return (
    <div className="wolf-mascot" ref={containerRef}>
      {/* Glow effect */}
      <div className="wolf-glow" ref={glowRef} />

      {/* Wolf body structure */}
      <div className="wolf-skeleton">
        {/* Tail */}
        <div className="wolf-tail" ref={tailRef}>
          <div className="tail-segment tail-base" />
          <div className="tail-segment tail-mid" />
          <div className="tail-segment tail-tip" />
        </div>

        {/* Body */}
        <div className="wolf-body" ref={bodyRef}>
          {/* Back leg */}
          <div className="wolf-leg wolf-back-leg" ref={backLegRef}>
            <div className="leg-upper" />
            <div className="leg-lower" />
            <div className="leg-paw" />
          </div>

          {/* Front leg */}
          <div className="wolf-leg wolf-front-leg" ref={frontLegRef}>
            <div className="leg-upper" />
            <div className="leg-lower" />
            <div className="leg-paw" />
          </div>

          {/* Torso */}
          <div className="wolf-torso" />

          {/* Head */}
          <div className="wolf-head" ref={headRef}>
            {/* Ears */}
            <div className="wolf-ear wolf-ear-left" ref={earLeftRef} />
            <div className="wolf-ear wolf-ear-right" ref={earRightRef} />

            {/* Face */}
            <div className="wolf-face">
              {/* Eyes */}
              <div className="wolf-eye wolf-eye-left" ref={eyeLeftRef}>
                <div className="eye-pupil" />
                <div className="eye-shine" />
              </div>
              <div className="wolf-eye wolf-eye-right" ref={eyeRightRef}>
                <div className="eye-pupil" />
                <div className="eye-shine" />
              </div>

              {/* Muzzle */}
              <div className="wolf-muzzle" ref={muzzleRef}>
                <div className="muzzle-top" />
                <div className="wolf-nose" />
                {/* Jaw */}
                <div className="wolf-jaw" ref={jawRef}>
                  <div className="jaw-inner" />
                  <div className="wolf-tongue" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breath particles for blow effect */}
      <div className="breath-particles" ref={breathParticlesRef}>
        <div className="breath-particle p1" />
        <div className="breath-particle p2" />
        <div className="breath-particle p3" />
        <div className="breath-particle p4" />
        <div className="breath-particle p5" />
      </div>
    </div>
  );
};

export default WolfMascot;
