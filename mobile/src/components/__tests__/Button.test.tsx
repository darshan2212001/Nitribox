import { render, fireEvent } from '@testing-library/react-native';
import Button from '../ui/Button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(<Button title="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<Button title="Test Button" onPress={mockOnPress} />);
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading prop is true', () => {
    const { getByTestId } = render(
      <Button title="Test Button" onPress={() => {}} loading={true} />
    );
    
    // Check if ActivityIndicator is present (loading state)
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} disabled={true} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('applies correct styles for different variants', () => {
    const { getByText } = render(
      <Button title="Primary Button" onPress={() => {}} variant="primary" />
    );
    
    const button = getByText('Primary Button');
    expect(button).toBeTruthy();
  });

  it('applies correct styles for different sizes', () => {
    const { getByText } = render(
      <Button title="Large Button" onPress={() => {}} size="large" />
    );
    
    const button = getByText('Large Button');
    expect(button).toBeTruthy();
  });
});
