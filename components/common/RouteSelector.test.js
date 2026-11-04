/* global jest, test, expect */
import React from 'react';
import { act, create } from 'react-test-renderer';
import RouteSelector from './RouteSelector';
import Button from '../ui/PaperButton';

jest.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: { colors: {} } }) }));
jest.mock('../../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: key => key }) }));
jest.mock('react-native-paper', () => ({ Surface: 'Surface', Text: 'Text' }));
jest.mock('../ui/PaperButton', () => 'Button');

const routes = [{ id: 'home', name: 'Casa' }, { id: 'school', name: 'Colegio' }];

test('selects a different route and does not save the already selected route again', () => {
  const onSelect = jest.fn();
  let tree;
  act(() => { tree = create(<RouteSelector routes={routes} selectedRouteId="home" onSelect={onSelect} />); });
  const buttons = tree.root.findAllByType(Button);
  expect(buttons[0].props.accessibilityState.selected).toBe(true);
  act(() => { buttons[0].props.onPress(); });
  expect(onSelect).not.toHaveBeenCalled();
  act(() => { buttons[1].props.onPress(); });
  expect(onSelect).toHaveBeenCalledWith(routes[1]);
  act(() => { tree.unmount(); });
});

test.each([{ savingRouteId: 'school' }, { disabled: true }])('blocks changes while saving or without permission: %o', props => {
  const onSelect = jest.fn();
  let tree;
  act(() => { tree = create(<RouteSelector routes={routes} selectedRouteId="home" onSelect={onSelect} {...props} />); });
  for (const button of tree.root.findAllByType(Button)) {
    expect(button.props.disabled).toBe(true);
    act(() => { button.props.onPress(); });
  }
  expect(onSelect).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});

test.each([[[]], [routes.slice(0, 1)]])('does not show unnecessary choices for %j', available => {
  let tree;
  act(() => { tree = create(<RouteSelector routes={available} onSelect={jest.fn()} />); });
  expect(tree.toJSON()).toBeNull();
  act(() => { tree.unmount(); });
});
