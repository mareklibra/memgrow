/**
 * Material Tailwind React compatibility layer for React 19
 * This file provides properly typed wrapper components that satisfy React 19 requirements
 */

import React from 'react';
import {
  Card as MTCard,
  CardBody as MTCardBody,
  CardFooter as MTCardFooter,
  Typography as MTTypography,
  Input as MTInput,
  Button as MTButton,
  Switch as MTSwitch,
  Textarea as MTTextarea,
  List as MTList,
  ListItem as MTListItem,
  Spinner as MTSpinner,
  Checkbox as MTCheckbox,
  Progress as MTProgress,
  CardProps,
  CardBodyProps,
  CardFooterProps,
  TypographyProps,
  InputProps,
  ButtonProps,
  SwitchProps,
  TextareaProps,
  ListProps,
  ListItemProps,
  SpinnerProps,
  CheckboxProps,
  ProgressProps,
} from '@material-tailwind/react';

// Default props to satisfy React 19 requirements
const defaultMTProps = {
  placeholder: '',
  onPointerEnterCapture: () => {},
  onPointerLeaveCapture: () => {},
  onResize: () => {},
  onResizeCapture: () => {},
  crossOrigin: undefined,
};

// Wrapper components with proper typing
export const Card: React.FC<CardProps> = (props) => (
  <MTCard {...defaultMTProps} {...props} />
);

export const CardBody: React.FC<CardBodyProps> = (props) => (
  <MTCardBody {...defaultMTProps} {...props} />
);

export const CardFooter: React.FC<CardFooterProps> = (props) => (
  <MTCardFooter {...defaultMTProps} {...props} />
);

export const Typography: React.FC<TypographyProps> = (props) => (
  <MTTypography {...defaultMTProps} {...props} />
);

export const Input: React.FC<InputProps> = (props) => (
  <MTInput {...defaultMTProps} {...props} />
);

export const Button: React.FC<ButtonProps> = (props) => (
  <MTButton {...defaultMTProps} {...props} />
);

export const Switch: React.FC<SwitchProps> = (props) => (
  <MTSwitch {...defaultMTProps} {...props} />
);

export const Textarea: React.FC<TextareaProps> = ({ ref, ...props }) => (
  <MTTextarea {...defaultMTProps} {...props} />
);

export const List: React.FC<ListProps> = (props) => (
  <MTList {...defaultMTProps} {...props} />
);

export const ListItem: React.FC<ListItemProps> = (props) => (
  <MTListItem {...defaultMTProps} {...props} />
);

export const Spinner: React.FC<SpinnerProps> = (props) => (
  <MTSpinner {...defaultMTProps} {...props} />
);

export const Checkbox: React.FC<CheckboxProps> = (props) => (
  <MTCheckbox {...defaultMTProps} {...props} />
);

export const Progress: React.FC<ProgressProps> = (props) => (
  <MTProgress {...defaultMTProps} {...props} />
);