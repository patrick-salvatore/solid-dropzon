import { FileWithPath } from 'file-selector';

export type EmptyObject = { [key: string]: never };

export type MimeTypes =
  | '.aac/*'
  | '.abw/*'
  | '.arc/*'
  | '.avif/*'
  | '.avi/*'
  | '.azw/*'
  | '.bin/*'
  | '.bmp/*'
  | '.bz/*'
  | '.bz2/*'
  | '.cda/*'
  | '.csh/*'
  | '.css/*'
  | '.csv/*'
  | '.doc/*'
  | '.docx/*'
  | '.eot/*'
  | '.epub/*'
  | '.gz/*'
  | '.gif/*'
  | '.htm/*'
  | '.ico/*'
  | '.ics/*'
  | '.jar/*'
  | '.jpeg/*'
  | '.js/*'
  | '.json/*'
  | '.jsonld/*'
  | '.mid/*'
  | '.mjs/*'
  | '.mp3/*'
  | '.mp4/*'
  | '.mpeg/*'
  | '.mpkg/*'
  | '.opus/*'
  | '.otf/*'
  | '.png/*'
  | '.pdf/*'
  | '.php/*'
  | '.ppt/*'
  | '.pptx/*'
  | '.rar/*'
  | '.rtf/*'
  | '.sh/*'
  | '.svg/*'
  | '.swf/*'
  | '.tar/*'
  | '.tif/*'
  | '.ts/*'
  | '.ttf/*'
  | '.txt/*'
  | '.vsd/*'
  | '.wav/*'
  | '.weba/*'
  | '.webm/*'
  | '.webp/*'
  | '.woff/*'
  | '.woff2/*'
  | '.xhtml/*'
  | '.xls/*'
  | '.xlsx/*'
  | '.xml/*'
  | '.xul/*'
  | '.zip/*';

export type Types = { description: string; accept: { [K in MimeTypes]: string[] } | EmptyObject };
export type ShowOpenFilePickerFnArg = {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: Types[];
};

export type ShowOpenFilePickerFn = (arg: ShowOpenFilePickerFnArg) => Promise<any>;

export type DropzoneWindow = Window & {
  showOpenFilePicker?: ShowOpenFilePickerFn;
};

export type DropzoneFile = File & (FileWithPath | DataTransferItem) & { path?: string };

export type Files = Array<{
  errors: Array<{
    code: string;
    message: string;
  }>;
  file: DropzoneFile;
}>;

export type DropzoneError = {
  code: string;
  message: string;
};

export type RejectedFiles = Array<{
  file: DropzoneFile;
  errors: Array<Error>;
}>;

export type InitialState = {
  isFocused: boolean;
  isFileDialogActive: boolean;
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  draggedFiles: any[];
  files: Files;
};

export type AcceptedFileType = string | string[];

export type DropzoneEvent = (DragEvent & Event) | null;

export type UseDropzoneArg = Partial<{
  fileTypes: AcceptedFileType;
  disabled: boolean;
  maxSize: number;
  minSize: number;
  maxFiles: number;
  useFsAccessApi: boolean;
  preventDropOnDocument: boolean;
  noClick: boolean;
  noKeyboard: boolean;
  noDrag: boolean;
  noDragEventsBubbling: boolean;
  validator<T>(f: T): Array<{
    code: string;
    message: string;
  }>;
  onDrop: <
    A extends {
      errors: Array<{
        code: string;
        message: string;
      }>;
      file: DropzoneFile;
    },
  >(
    acceptedFiles: A[],
    tooManyFiles: DropzoneError | undefined,
    event: DropzoneEvent,
  ) => void;
  onFileDialogCancel: () => void;
  onFileDialogOpen: () => void;
  onDragEnter: <T>(files: T, e: DropzoneEvent) => any;
  onDragLeave: <T>(files: T, e: DropzoneEvent) => any;
  onDragOver: (e: DropzoneEvent) => any;
}>;
