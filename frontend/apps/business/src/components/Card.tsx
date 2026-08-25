import React from 'react';

interface CardProps {
  style?: React.CSSProperties;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
}) => {
  const paddingClass = `card-padding-${padding}`;
  const shadowClass = `card-shadow-${shadow}`;
  return (
    <div className={`card ${paddingClass} ${shadowClass} ${className}`}>
      {children}
    </div>
  );
};