import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [emotion, setEmotion] = useState('');

  useEffect(() => {
    const setupCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            resolve();
          };
        });
        videoRef.current.play();
      }
    };

    setupCamera();
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    };

    loadModels();
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const detectEmotion = async () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);
        canvasRef.current.appendChild(canvas);

        const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
        faceapi.matchDimensions(canvas, displaySize);

        const processVideo = async () => {
          const detections = await faceapi.detectAllFaces(videoRef.current!, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

          if (detections.length > 0) {
            const expression = detections[0].expressions;
            const maxValue = Math.max(...Object.values(expression));
            const emotion = Object.keys(expression).filter((item) => {
              return (expression[item as keyof faceapi.FaceExpressions] === maxValue);
            }).join(', ');
            setEmotion(emotion);
          }

          animationFrameId = requestAnimationFrame(processVideo);
        };

        processVideo();
      }
    };

    if (videoRef.current && videoRef.current.readyState >= 2) {
      detectEmotion();
    } else if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', detectEmotion);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [videoRef]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ position: 'relative', marginRight: '20px' }}>
        <video ref={videoRef} width="640" height="480" autoPlay muted style={{ display: 'block' }} />
        <div ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      </div>
      <div>
        <h1>Gerçek Zamanlı Duygu Tanıma</h1>
        <h2>Tespit Edilen Duygu: {emotion}</h2>
      </div>
    </div>
  );
}
