import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { log } from '../lib/logger';

interface CameraComponentProps {
  onImageSelected?: (imageUri: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  mode?: 'photo' | 'barcode' | 'both';
}

export default function CameraComponent({ 
  onImageSelected, 
  onBarcodeScanned,
  mode = 'photo' 
}: CameraComponentProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const cameraRef = useRef<CameraView>(null);

  const requestPermissions = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos and scan barcodes.');
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        if (photo) {
          setCapturedImage(photo.uri);
          onImageSelected?.(photo.uri);
        }
      } catch (error) {
        log.error('Error taking picture', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery permission is required to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setCapturedImage(imageUri);
      onImageSelected?.(imageUri);
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (isScanning) {
      setIsScanning(false);
      onBarcodeScanned?.(data);
      Alert.alert('Barcode Scanned', `Type: ${type}\nData: ${data}`);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => 
      current === 'back' 
        ? 'front' 
        : 'back'
    );
  };

  const startScanning = () => {
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
        <Text style={styles.message}>Camera access denied</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          <View style={styles.imageActions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setCapturedImage(null)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => onImageSelected?.(capturedImage)}
            >
              <Ionicons name="checkmark" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          onBarcodeScanned={mode === 'barcode' || mode === 'both' ? handleBarcodeScanned : undefined}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
              
              {mode === 'barcode' || mode === 'both' ? (
                <TouchableOpacity 
                  style={[styles.controlButton, isScanning && styles.activeButton]} 
                  onPress={isScanning ? stopScanning : startScanning}
                >
                  <Ionicons name="scan" size={24} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
                <Ionicons name="images" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <View style={styles.placeholder} />
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 25,
  },
  activeButton: {
    backgroundColor: '#10B981',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  galleryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 25,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 48,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedImage: {
    width: '90%',
    height: '70%',
    borderRadius: 12,
  },
  imageActions: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 30,
  },
});
