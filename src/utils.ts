import { AcceptedFileType, DropzoneEvent } from './types';

// Error codes
export const FILE_INVALID_TYPE = 'file-invalid-type';
export const FILE_TOO_LARGE = 'file-too-large';
export const FILE_TOO_SMALL = 'file-too-small';
export const DUP_FILE_FOUND = 'duplicate-file-founce';
export const TOO_MANY_FILES = 'too-many-files';

export const ErrorCodeMap = {
  FileInvalidType: FILE_INVALID_TYPE,
  FileTooLarge: FILE_TOO_LARGE,
  FileTooSmall: FILE_TOO_SMALL,
  TooManyFiles: TOO_MANY_FILES,
} as const;

export const DUP_FILE_FOUND_REJECTION = {
  code: DUP_FILE_FOUND,
  message: 'Found a duplicate file',
} as const;
export const TOO_MANY_FILES_REJECTION = {
  code: TOO_MANY_FILES,
  message: 'Too many files',
} as const;

// File Errors
export const getInvalidTypeRejectionErr = (accept: AcceptedFileType) => {
  accept = Array.isArray(accept) && accept.length === 1 ? accept[0] : accept;
  const messageSuffix = Array.isArray(accept) ? `one of ${accept.join(', ')}` : accept;
  return {
    code: FILE_INVALID_TYPE,
    message: `File type must be ${messageSuffix}`,
  };
};

export const getTooLargeRejectionErr = (maxSize: number) => {
  return {
    code: FILE_TOO_LARGE,
    message: `File is larger than ${maxSize} ${maxSize === 1 ? 'byte' : 'bytes'}`,
  };
};

export const getTooSmallRejectionErr = (minSize: number) => {
  return {
    code: FILE_TOO_SMALL,
    message: `File is smaller than ${minSize} ${minSize === 1 ? 'byte' : 'bytes'}`,
  };
};

export function fileMatchType(file: File, fileType: AcceptedFileType) {
  const isAcceptable = file.type === 'application/x-moz-file' || accepts(file, fileType);
  return [isAcceptable, isAcceptable ? null : getInvalidTypeRejectionErr(fileType)] as const;
}

export function fileMatchSize(file: File, minSize: number, maxSize: number) {
  if (file.size) {
    if (minSize && maxSize) {
      if (file.size > maxSize) return [false, getTooLargeRejectionErr(maxSize)] as const;
      if (file.size < minSize) return [false, getTooSmallRejectionErr(minSize)] as const;
    } else if (minSize && file.size < minSize)
      return [false, getTooSmallRejectionErr(minSize)] as const;
    else if (maxSize && file.size > maxSize)
      return [false, getTooLargeRejectionErr(maxSize)] as const;
  }
  return [true, null] as const;
}

type AllFilesAcceptedArg = {
  files: File[];
  fileTypes: AcceptedFileType;
  minSize: number;
  maxSize: number;
  maxFiles: number;
};
export function allFilesAccepted({
  files,
  fileTypes,
  minSize,
  maxSize,
  maxFiles,
}: AllFilesAcceptedArg) {
  if (files.length > 1 || (maxFiles >= 1 && files.length > maxFiles)) {
    return false;
  }

  return files.every((file) => {
    const [accepted] = fileMatchType(file, fileTypes);
    const [sizeMatch] = fileMatchSize(file, minSize, maxSize);
    return accepted && sizeMatch;
  });
}

export function isPropagationStopped(event: any) {
  if (typeof event?.isPropagationStopped === 'function') {
    return event.isPropagationStopped();
  } else if (typeof event?.cancelBubble !== 'undefined') {
    return event.cancelBubble;
  }
  return false;
}

export function isEvtWithFiles(event: DropzoneEvent) {
  if (!event?.dataTransfer) {
    return !!event?.target && !!(event.target as HTMLInputElement).files;
  }
  return event.dataTransfer.types.some(
    (type) => type === 'Files' || type === 'application/x-moz-file',
  );
}

export function isIeOrEdge(userAgent = window.navigator.userAgent) {
  const isIe = userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident/') !== -1;
  const isEdge = userAgent.indexOf('Edge/') !== -1;

  return isIe || isEdge;
}

export function composeEventHandlers(...fns: any[]) {
  return (event: Event, ...args: any[]) => {
    return fns.filter(Boolean).some((fn) => {
      if (!isPropagationStopped(event) && fn) {
        fn(event, ...args);
      }
      return isPropagationStopped(event);
    });
  };
}

export function filePickerOptionsTypes(accept: AcceptedFileType) {
  accept = typeof accept === 'string' ? accept.split(',') : accept;
  return [
    {
      description: '',
      accept: Array.isArray(accept)
        ? accept
            .filter(
              (item) =>
                item === 'audio/*' ||
                item === 'video/*' ||
                item === 'image/*' ||
                item === 'text/*' ||
                /\w+\/[-+.\w]+/g.test(item),
            )
            .reduce((a, b) => ({ ...a, [b]: [] }), {} as any)
        : {},
    },
  ];
}

export function isAbort(e: Error) {
  return e instanceof DOMException && (e.name === 'AbortError' || e.code === e.ABORT_ERR);
}

export function isSecurityError(e: Error) {
  return e instanceof DOMException && (e.name === 'SecurityError' || e.code === e.SECURITY_ERR);
}

export function noop(): undefined {
  return;
}

function accepts(file: any, acceptedTypes: AcceptedFileType) {
  acceptedTypes = Array.isArray(acceptedTypes) ? acceptedTypes : acceptedTypes.split(',');

  if (acceptedTypes[0] === 'all') return true;

  const fileName = file.name || '';
  const mimeType = (file.type || '').toLowerCase();
  const baseMimeType = mimeType.replace(/\/.*$/, '');

  return acceptedTypes.some((type) => {
    const validType = type.trim().toLowerCase();
    if (validType.charAt(0) === '.') {
      return fileName.toLowerCase().endsWith(validType);
    } else if (validType.endsWith('/*')) {
      // This is something like a [type]/* mime type
      return baseMimeType === validType.replace(/\/.*$/, '');
    }
    return mimeType === validType;
  });
}

export function remove_duplicates_objects(list: any[]) {
  const out = [] as any[];
  const uniqueObject = {} as Record<string, any>;

  for (let i = 0; i < list.length; i++) {
    const k = list[i]['file']['path'];
    uniqueObject[k] = list[i];
  }

  for (const i in uniqueObject) {
    out.push(uniqueObject[i]);
  }

  return out;
}
