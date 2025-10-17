import React from 'react';
import { BarLoader, ClipLoader, RingLoader } from 'react-spinners';

interface LoadingSpinnerProps {
    size?: number;
    color?: string;
    type?: 'clip' | 'ring' | 'bar';
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 35,
    color = '#14b8a6',
    type = 'bar',
    className = '',
}) => {
    const LoaderComponent =
        type === 'ring' ? RingLoader :
            type === 'bar' ? BarLoader :
                ClipLoader;

    return (
        <div className={`flex justify-center items-center ${className}`}>
            <LoaderComponent size={size} color={color} />
        </div>
    );
};

export default LoadingSpinner;