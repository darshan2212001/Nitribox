import { useState } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { log } from '../lib/logger';

interface ImageResult {
  uri: string;
  width: number;
  height: number;
  type: string;
}

export function useCamera() {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
      
      return Object.values(granted).every(permission => permission === PermissionsAndroid.RESULTS.GRANTED);
    }
    
    return true;
  };

  const takePhoto = async (): Promise<ImageResult | null> => {
    setIsLoading(true);
    
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: 'image/jpeg',
        };
      }
      
      return null;
    } catch (error) {
      log.error('Error taking photo', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async (): Promise<ImageResult | null> => {
    setIsLoading(true);
    
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to select images.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: 'image/jpeg',
        };
      }
      
      return null;
    } catch (error) {
      log.error('Error picking image', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const showImagePicker = (onImageSelected: (image: ImageResult) => void) => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const image = await takePhoto();
            if (image) onImageSelected(image);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const image = await pickImage();
            if (image) onImageSelected(image);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return {
    takePhoto,
    pickImage,
    showImagePicker,
    isLoading,
  };
}