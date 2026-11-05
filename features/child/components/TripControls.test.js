/* global jest, test, expect */
import React from 'react';
import { act, create } from 'react-test-renderer';
import TripControls from './TripControls';
import Button from '../../../components/ui/PaperButton';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: { colors: { primary: '#123456', textOnPrimary: '#ffffff' } } }),
}));
jest.mock('../../../components/ui/PaperButton', () => 'Button');

test('does not expose a finish action while the student is sharing location', () => {
  let tree;
  act(() => { tree = create(<TripControls status="sharing" loading={false} onStart={jest.fn()} />); });
  expect(tree.toJSON()).toBeNull();
  act(() => { tree.unmount(); });
});

test('only exposes the start action while the student is not sharing', () => {
  const onStart = jest.fn();
  let tree;
  act(() => { tree = create(<TripControls status="paused" loading={false} onStart={onStart} />); });
  const button = tree.root.findByType(Button);
  expect(button.props.accessibilityLabel).toBe('Iniciar compartir ubicación');
  expect(button.props.children).toBe('Iniciar trayecto');
  act(() => { button.props.onPress(); });
  expect(onStart).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});
