import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';

interface ImageCarouselProps {
  images: string[];
  height?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ImageCarousel({ images, height = 250 }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    if (images.length === 0) return;
    setCurrentIndex(i => (i + 1) % images.length);
  };

  const goPrev = () => {
    if (images.length === 0) return;
    setCurrentIndex(i => (i - 1 + images.length) % images.length);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -20) goNext();
        else if (g.dx > 20) goPrev();
      },
    })
  ).current;

  if (images.length === 0) return null;

  return (
    <View style={{ height }} {...panResponder.panHandlers}>
      <Image
        source={{ uri: images[currentIndex] }}
        style={[styles.image, { height }]}
        resizeMode="cover"
      />
      <TouchableWithoutFeedback onPress={goPrev}>
        <View style={styles.touchLeft} />
      </TouchableWithoutFeedback>
      <TouchableWithoutFeedback onPress={goNext}>
        <View style={styles.touchRight} />
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: SCREEN_WIDTH,
  },
  touchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  touchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
});
