// PCM downsampler AudioWorklet processor.
// Receives Float32 frames at the AudioContext sample rate, decimates to 16 kHz,
// converts to little-endian Int16, and posts ~50ms ArrayBuffer chunks back to
// the main thread.
class PcmDownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const params = (options && options.processorOptions) || {};
    this.targetSampleRate = params.targetSampleRate || 16000;
    this.chunkMs = params.chunkMs || 50;
    this.ratio = sampleRate / this.targetSampleRate;
    this.targetSamplesPerChunk = Math.max(
      160,
      Math.floor((this.targetSampleRate * this.chunkMs) / 1000),
    );
    this.inputBuffer = [];
    this.inputBufferLength = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const channel = input[0];
    if (!channel || channel.length === 0) {
      return true;
    }

    // Copy to keep ownership across renders.
    const copy = new Float32Array(channel.length);
    copy.set(channel);
    this.inputBuffer.push(copy);
    this.inputBufferLength += copy.length;

    const inputSamplesNeededPerChunk = Math.ceil(this.targetSamplesPerChunk * this.ratio);

    while (this.inputBufferLength >= inputSamplesNeededPerChunk) {
      const inputChunk = new Float32Array(inputSamplesNeededPerChunk);
      let copied = 0;
      while (copied < inputSamplesNeededPerChunk && this.inputBuffer.length > 0) {
        const head = this.inputBuffer[0];
        const remaining = inputSamplesNeededPerChunk - copied;
        if (head.length <= remaining) {
          inputChunk.set(head, copied);
          copied += head.length;
          this.inputBuffer.shift();
        } else {
          inputChunk.set(head.subarray(0, remaining), copied);
          this.inputBuffer[0] = head.subarray(remaining);
          copied += remaining;
        }
      }
      this.inputBufferLength -= inputSamplesNeededPerChunk;

      const outputLength = Math.floor(inputSamplesNeededPerChunk / this.ratio);
      const pcm = new Int16Array(outputLength);
      for (let i = 0; i < outputLength; i++) {
        const idx = Math.floor(i * this.ratio);
        let sample = inputChunk[idx];
        if (sample > 1) sample = 1;
        if (sample < -1) sample = -1;
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-downsampler", PcmDownsamplerProcessor);
