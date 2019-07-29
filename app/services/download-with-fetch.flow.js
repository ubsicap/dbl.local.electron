// @flow
import fsExtra from 'fs-extra';
import fs from 'fs';
import path from 'path';

/*
 * Ensure completion without errors.
 * NOTE: when upgrading to electron 5(?) do the following instead:
 * // import events from 'events';
 * // await events.prototype.once(writer, 'finish');
 */
function onFinish(writable) {
  return new Promise(async (resolve, reject) => {
    try {
      writable.on('finish', () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

/*
 * Downloader.download('https://download.damieng.com/fonts/original/EnvyCodeR-PR7.zip',
 *  'envy-code-r.zip', (bytes, percent) => console.log(`Downloaded ${bytes} (${percent})`));
 */

// Public: Download a file and store it on a file system using streaming with appropriate progress callback.
//
// * `sourceUrl`        Url to download from.
// * `targetFile`       File path to save to.
// * `progressCallback` Callback function that will be given a {ByteProgressCallback} object containing
//                      both bytesDone and percent.
// * `length`           Optional file length in bytes for cases where the server will not supply the
//                      Content-Length header but the value is known in advance. Without either the
//                      percentage on the callback can not be determined.
//
// Returns a {Promise} that will accept when complete.
export default async function download(
  sourceUrl: string,
  targetFile: string,
  progressCallback: ?ByteProgressCallback,
  headers: ?{},
  length: ?number
): Promise<void> {
  const request = new Request(sourceUrl, {
    headers: new Headers({
      'Content-Type': 'application/octet-stream',
      ...(headers || {})
    })
  });

  const response = await fetch(request);
  if (!response.ok) {
    throw Error(
      `Unable to download, server returned ${response.status} ${
        response.statusText
      }`
    );
  }

  const { body } = response;
  if (body == null) {
    throw Error('No response body');
  }

  const finalLength =
    length || parseInt(response.headers.get('Content-Length') || '0', 10);
  const reader = body.getReader();
  const directory = path.dirname(targetFile);
  await fsExtra.ensureDir(directory);
  const writer = fs.createWriteStream(targetFile);

  await streamWithProgress(finalLength, reader, writer, progressCallback);
  writer.end();
  await onFinish(writer);
}

// Stream from a {ReadableStreamReader} to a {WriteStream} with progress callback.
//
// * `length`           File length in bytes.
// * `reader`           {ReadableStreamReader} to read from.
// * `targwriteretFile` {WriteStream} to write to.
// * `progressCallback` Callback function that will be given a {ByteProgressCallback} object containing
//                      both bytesDone and percent.
//
// Returns a {Promise} that will accept when complete.
async function streamWithProgress(
  length: number,
  reader: ReadableStreamReader,
  writer: fs.WriteStream,
  progressCallback: ?ByteProgressCallback
): Promise<void> {
  let bytesDone = 0;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const result = await reader.read();
    if (result.done) {
      if (progressCallback != null) {
        progressCallback(bytesDone, 100);
      }
      return;
    }

    const chunk = result.value;
    if (chunk == null) {
      throw Error('Empty chunk received during download');
    } else {
      writer.write(Buffer.from(chunk));
      if (progressCallback != null) {
        bytesDone += chunk.byteLength;
        const percent: ?number =
          length === 0 ? null : Math.floor((bytesDone / length) * 100);
        progressCallback(bytesDone, percent);
      }
    }
  }
}

// Public: Progress callback function signature indicating the bytesDone and
// optional percentage when length is known.
export type ByteProgressCallback = (bytesDone: number, percent: ?number) => {};
