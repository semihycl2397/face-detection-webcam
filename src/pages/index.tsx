import React, { useEffect, useRef, useState, ReactNode } from 'react';
import * as faceapi from 'face-api.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log("Error caught in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [emotion, setEmotion] = useState('');

  useEffect(() => {
    const setupCamera = async () => {
      try {
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
          console.log("Camera setup complete.");
        }
      } catch (error) {
        console.error("Error setting up camera:", error);
      }
    };

    setupCamera();
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = `${window.location.origin}/models`;
      console.log("Loading models...");
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      console.log("Models loaded.");
    };

    loadModels().then(() => {
      if (videoRef.current) {
        videoRef.current.addEventListener('loadeddata', detectEmotion);
        console.log("Video loaded, starting emotion detection.");
      }
    });
  }, [videoRef.current]);

  const detectEmotion = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      canvasRef.current.appendChild(canvas);

      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
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

        requestAnimationFrame(processVideo);
      };

      processVideo();
    } else {
      console.error("Video element or canvas element is not available, or video is not ready yet.");
    }
  };

  return (
    <ErrorBoundary>
      <div>
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
      </div>
    </ErrorBoundary>
  );
}
