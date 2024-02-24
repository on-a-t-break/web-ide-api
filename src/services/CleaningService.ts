import fs from 'fs';

let interval: any;
export default class CleaningService {
    public static setup(): void {
        clearInterval(interval);

        interval = setInterval(() => {

        }, 60 * 60 * 1000); // Every hour

        // Once on startup

    }

}
