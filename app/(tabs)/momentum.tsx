import { StyleSheet, Text, View } from 'react-native';

export default function MomentumScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Momentum</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1A1814',
  },
});
