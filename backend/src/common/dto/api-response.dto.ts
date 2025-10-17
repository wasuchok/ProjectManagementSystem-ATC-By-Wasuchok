export class ApiResponse<T> {
    message: string;
    statusCode: number;
    data: T;

    constructor(message: string, statusCode: number, data: T) {
        this.message = message;
        this.statusCode = statusCode;
        this.data = data;
    }
}