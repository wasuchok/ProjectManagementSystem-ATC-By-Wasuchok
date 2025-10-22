
import Hashids from 'hashids';

const salt = process.env.NEXT_PUBLIC_HASHIDS_SALT || 'your-secret-salt-here';
const hashids = new Hashids(salt, 20);


export function encodeHashid(numbers: number[]): string {
    return hashids.encode(...numbers);
}


export function decodeHashid(hash: string): number[] {
    const decoded = hashids.decode(hash);
    if (!decoded || !Array.isArray(decoded)) {
        throw new Error('Invalid hashid');
    }
    return decoded as number[];
}

export function encodeSingleHashid(id: number): string {
    return encodeHashid([id]);
}


export function decodeSingleHashid(hash: string): number {
    const decoded = decodeHashid(hash);
    return decoded[0];
}