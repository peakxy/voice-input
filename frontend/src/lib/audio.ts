export type AudioStreamHandle = {
  audioContext: AudioContext;
  stop: () => Promise<void>;
};

export type AudioStreamOptions = {
  onChunk: (chunk: ArrayBuffer) => void;
  targetSampleRate?: number;
  chunkMs?: number;
  workletUrl?: string;
};

const WORKLET_URL = "/worklets/pcm-downsampler.js";

export async function startMicrophone(options: AudioStreamOptions): Promise<AudioStreamHandle> {
  const { onChunk, targetSampleRate = 16000, chunkMs = 50, workletUrl = WORKLET_URL } = options;

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器不支持麦克风采集");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioContextCtor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("当前浏览器不支持 Web Audio API");
  }

  const audioContext = new AudioContextCtor();
  try {
    await audioContext.audioWorklet.addModule(workletUrl);
  } catch (err) {
    stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
    throw new Error(
      `加载 PCM AudioWorklet 失败：${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const source = audioContext.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(audioContext, "pcm-downsampler", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: {
      targetSampleRate,
      chunkMs,
    },
  });

  node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    onChunk(event.data);
  };

  source.connect(node);
  // Required on Chrome to keep the graph alive even though we do not need audio output.
  const sink = audioContext.createGain();
  sink.gain.value = 0;
  node.connect(sink).connect(audioContext.destination);

  return {
    audioContext,
    async stop() {
      try {
        node.port.onmessage = null;
        node.disconnect();
        source.disconnect();
        sink.disconnect();
      } catch {
        // ignore disconnect errors
      }
      stream.getTracks().forEach((track) => track.stop());
      try {
        await audioContext.close();
      } catch {
        // ignore close errors
      }
    },
  };
}
