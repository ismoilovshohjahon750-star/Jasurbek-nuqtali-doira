import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Person } from '../types';

export const ReceptionRobot: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const fetchPeople = async () => {
      const querySnapshot = await getDocs(collection(db, 'people'));
      setPeople(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person)));
    };
    fetchPeople();
  }, []);

  const scanFace = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && people.length > 0) {
      const randomMatch = people[Math.floor(Math.random() * people.length)];
      setDetectedName(randomMatch.name);
      setTimeout(() => setDetectedName(null), 3000);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {loadingCamera && (
        <div className="absolute inset-0 flex items-center justify-center text-yellow-500 z-10">
          Kamera ishga tushirilmoqda...
        </div>
      )}
      
      <Webcam 
        audio={false} 
        ref={webcamRef} 
        screenshotFormat="image/jpeg" 
        onUserMedia={() => setLoadingCamera(false)}
        onUserMediaError={(err) => console.error(err)}
        videoConstraints={{ facingMode: "user" }}
        disablePictureInPicture={false}
        forceScreenshotSourceSize={false}
        imageSmoothing={true}
        mirrored={false}
        screenshotQuality={1}
        className="absolute inset-0 w-full h-full object-cover" 
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-end p-6 z-10 bg-gradient-to-t from-black/80 to-transparent">
        <h1 className="text-3xl font-bold mb-6">Reception Robot</h1>
        
        <button 
          onClick={scanFace} 
          className={`px-6 py-3 rounded-xl font-bold ${loadingCamera ? 'bg-gray-600' : 'bg-blue-600'}`}
          disabled={loadingCamera}
        >
          {loadingCamera ? 'Kutilmoqda...' : 'Face ID'}
        </button>

        {detectedName && <div className="mt-4 text-2xl font-bold text-green-400">Salom, {detectedName}!</div>}
      </div>
    </div>
  );
};
