import { apiHandler } from '../../../../../lib/helpers/api-handler'
import fs from 'fs'

export function handleImageRequest(req, res) {
    const { imagehash } = req.query;
    // look for the image in the images folder @ public/images
    const imageDir = `${__dirname}/../../../../../../../public/images/`;

    // find all files in the images directory that hash the name of imagehash
    const files = fs.readdirSync(imageDir).filter(file => file.startsWith(imagehash));
    
    if(files.length > 0) {
        const file = files[0];

        // if the image exists, send it
        const stat = fs.statSync(`${imageDir}${file}`);

        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': stat.size
        });

        const readStream = fs.createReadStream(`${imageDir}${file}`);
        // We replaced all the event handlers with a simple call to readStream.pipe()
        readStream.pipe(res);
    }
    else {
        // otherwise, send a 404
        res.status(404).send('Image not found');
    }
}

export default apiHandler(handleImageRequest, ['cors'])