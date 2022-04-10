import { Accessor, createComputed, createSignal, onCleanup, onMount } from 'solid-js';
import { fromEvent } from 'file-selector';

import {
  isEvtWithFiles,
  isPropagationStopped,
  fileMatchType,
  fileMatchSize,
  filePickerOptionsTypes,
  isAbort,
  isSecurityError,
  isIeOrEdge,
  composeEventHandlers,
  noop,
  remove_duplicates_objects,
  TOO_MANY_FILES_REJECTION,
  DUP_FILE_FOUND_REJECTION,
} from './utils';
import {
  Files,
  DropzoneEvent,
  DropzoneFile,
  DropzoneWindow,
  InitialState,
  UseDropzoneArg,
  DropzoneError,
} from './types';

const initialState: InitialState = {
  isFocused: false,
  isFileDialogActive: false,
  isDragActive: false,
  isDragAccept: false,
  isDragReject: false,
  draggedFiles: [],
  files: [],
};

type UseDropzoneTuple = [
  Accessor<InitialState>,
  {
    removeFile(i: number): void;
    getRootProps: () => any;
    getInputProps: () => any;
    rootRef: HTMLElement | null;
    inputRef: HTMLInputElement | null;
    isFocused: boolean;
    destroy: () => void;
    open: (() => void) | null;
  },
];

export function createDropzone(opts: UseDropzoneArg = {}): UseDropzoneTuple {
  const defaultProps = {
    disabled: false,
    maxSize: Infinity,
    minSize: 0,
    maxFiles: 0,
    preventDropOnDocument: true,
    noClick: false,
    noKeyboard: false,
    noDrag: false,
    noDragEventsBubbling: false,
    useFsAccessApi: true,
  };
  const {
    fileTypes = 'all',
    disabled,
    maxSize,
    minSize,
    maxFiles,
    useFsAccessApi,
    preventDropOnDocument,
    noClick,
    noKeyboard,
    noDrag,
    noDragEventsBubbling,
    onDragEnter = noop,
    onDragLeave = noop,
    onDragOver = noop,
    onDrop = noop,
    onFileDialogCancel = noop,
    onFileDialogOpen = noop,
    validator,
  } = {
    ...defaultProps,
    ...(opts || {}),
  };

  let inputRef: HTMLInputElement | null = null;
  // eslint-disable-next-line prefer-const
  let rootRef: HTMLElement | null = null;
  let dragTargetsRef: (EventTarget | null)[] = [];
  let fsAccessApiWorksRef =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    useFsAccessApi &&
    (window as DropzoneWindow).showOpenFilePicker;

  const [state, dispatch] = createSignal<InitialState>(initialState);

  const onFileDialogOpenCb = typeof onFileDialogOpen === 'function' ? onFileDialogOpen : noop;

  const onFileDialogCancelCb = typeof onFileDialogCancel === 'function' ? onFileDialogCancel : noop;

  const getFilesFromEvent = (e: DropzoneEvent) => fromEvent(e) as Promise<Array<DropzoneFile>>;

  createComputed(() => {
    // lol - force tracking of state since onWindowFocus isn't
    // called directly in the createComputed scope
    const onWindowFocus = ((s) => {
      return () => {
        if (!fsAccessApiWorksRef && s.isFileDialogActive) {
          setTimeout(() => {
            if (inputRef) {
              if (!inputRef?.files?.length) {
                dispatch((s) => ({
                  ...s,
                  isFileDialogActive: false,
                }));
                onFileDialogCancelCb();
              }
            }
          }, 300);
        }
      };
    })(state());

    window.addEventListener('focus', onWindowFocus, false);
    onCleanup(() => window.removeEventListener('focus', onWindowFocus, false));
  });

  onMount(() => {
    function onDocumentDragOver(event: DropzoneEvent) {
      event?.preventDefault();
    }

    if (preventDropOnDocument) {
      document.addEventListener('dragover', onDocumentDragOver, false);
      document.addEventListener('drop', onDocumentDrop, false);
    }

    return () => {
      if (preventDropOnDocument) {
        document.removeEventListener('dragover', onDocumentDragOver);
        document.removeEventListener('drop', onDocumentDrop);
      }
    };
  });

  const onDocumentDrop = (event: DropzoneEvent) => {
    if (rootRef && event?.target && rootRef.contains(event.target as Node)) {
      return;
    }
    event?.preventDefault();
    dragTargetsRef = [];
  };

  const onDragEnterCb = (event: DropzoneEvent) => {
    event?.preventDefault();

    if (noDragEventsBubbling) {
      event?.stopPropagation();
    }

    event?.target && dragTargetsRef.push(event?.target);

    if (isEvtWithFiles(event)) {
      Promise.resolve(getFilesFromEvent(event)).then((draggedFiles) => {
        if (isPropagationStopped(event) && !noDragEventsBubbling) {
          return;
        }

        dispatch((S) => ({
          ...S,
          draggedFiles,
          files: S.files.map((f) => ({ ...f, errors: [] })),
          isDragActive: true,
        }));

        if (onDragEnter) {
          onDragEnter(draggedFiles, event);
        }
      });
    }
  };

  const onDragOverCb = (event: DropzoneEvent) => {
    event?.preventDefault();

    if (noDragEventsBubbling) {
      event?.stopPropagation();
    }

    const hasFiles = isEvtWithFiles(event);
    if (hasFiles && event?.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'copy';
      } catch {}
    }

    if (hasFiles && onDragOver) {
      onDragOver(event);
    }

    return false;
  };

  const onDragLeaveCb = (event: DropzoneEvent) => {
    event?.preventDefault();

    if (noDragEventsBubbling) {
      event?.stopPropagation();
    }

    const targets = dragTargetsRef.filter((target) => rootRef && rootRef.contains(target as Node));
    const targetIdx = event?.target ? targets.indexOf(event?.target) : -1;
    if (targetIdx !== -1) {
      targets.splice(targetIdx, 1);
    }
    dragTargetsRef = targets;
    if (targets.length > 0) {
      return;
    }

    if (isEvtWithFiles(event) && onDragLeave) {
      onDragLeave(state().draggedFiles, event);
    }

    dispatch((s) => ({
      ...s,
      isDragActive: false,
      draggedFiles: [],
    }));
  };

  const onDropCb = (event: DropzoneEvent) => {
    event?.preventDefault();

    if (noDragEventsBubbling) {
      event?.stopPropagation();
    }

    dragTargetsRef = [];

    if (isEvtWithFiles(event)) {
      Promise.resolve(getFilesFromEvent(event)).then((files) => {
        if (isPropagationStopped(event) && !noDragEventsBubbling) {
          return;
        }
        validateNSet(files, event);
      });
    }
  };

  const onKeyDownCb = (event: KeyboardEvent) => {
    if (!rootRef || !rootRef.isEqualNode(event.target as Node)) {
      return;
    }

    if (event.keyCode === 32 || event.keyCode === 13) {
      event.preventDefault();
      openFileDialog();
    }
  };

  const onFocusCb = () => {
    dispatch((s) => ({ ...s, isFocused: true }));
  };

  const onBlurCb = () => {
    dispatch((s) => ({ ...s, isFocused: false }));
  };

  const onClickCb = () => {
    if (!noClick) {
      if (isIeOrEdge()) {
        setTimeout(openFileDialog, 0);
      } else {
        openFileDialog();
      }
    }
  };

  const destroy = () => {
    dispatch(() => initialState);
  };

  const removeFile = (i: number) => {
    // I don't know if this is an anti-pattern to directly mutate state
    state().files.splice(i, 1);
    dispatch((s) => ({
      ...s,
    }));
  };

  const validateNSet = (files: File[], event: DropzoneEvent) => {
    let newFiles: Files = [...state().files];
    let tooManyfiles: DropzoneError | undefined;

    files.forEach((file) => {
      const [, acceptError] = fileMatchType(file, fileTypes);
      const [, sizeError] = fileMatchSize(file, minSize, maxSize);
      const customErrors = validator ? validator(file) : null;
      const errors = [];
      if (newFiles.map(({ file }) => file.name).includes(file.name)) {
        errors.push(DUP_FILE_FOUND_REJECTION);
      }
      if (sizeError) {
        errors.push(sizeError);
      }
      if (maxFiles < newFiles.length) {
        tooManyfiles = TOO_MANY_FILES_REJECTION;
      }
      if (customErrors) {
        errors.push(...customErrors);
      }
      if (acceptError) {
        errors.push(acceptError);
      }

      newFiles.push({ file, errors });
    });
    newFiles = remove_duplicates_objects(newFiles);

    if (newFiles.length > 0) {
      dispatch((s) => ({ ...s, files: newFiles }));
      if (onDrop) {
        onDrop(newFiles, tooManyfiles, event);
      }
    }
  };

  const w = window as DropzoneWindow;
  const openFileDialog = () => {
    if (fsAccessApiWorksRef) {
      dispatch((s) => ({ ...s, isFileDialogActive: true }));
      onFileDialogOpenCb();

      w.showOpenFilePicker &&
        w
          ?.showOpenFilePicker({
            multiple: maxFiles > 1 ? false : true,
            types: filePickerOptionsTypes(fileTypes),
          })
          .then((handles) => getFilesFromEvent(handles))
          .then((files) => {
            validateNSet(files, null);
            dispatch((s) => ({ ...s, isFileDialogActive: false }));
          })
          .catch((e) => {
            // AbortError means the user canceled
            if (isAbort(e)) {
              onFileDialogCancelCb();
              dispatch((s) => ({ ...s, isFileDialogActive: false }));
            } else if (isSecurityError(e)) {
              fsAccessApiWorksRef = false;

              if (inputRef) {
                inputRef.click();
                inputRef = null;
              }
            }
          });
    } else if (inputRef) {
      dispatch((s) => ({ ...s, isFileDialogActive: true }));
      onFileDialogOpenCb();
      inputRef.click();
      inputRef = null;
    }
  };

  const getRootProps = () => ({
    onKeyDown: noKeyboard || disabled ? null : composeEventHandlers(onKeyDownCb),
    onFocus: noKeyboard || disabled ? null : composeEventHandlers(onFocusCb),
    onBlur: noKeyboard || disabled ? null : composeEventHandlers(onBlurCb),
    onClick: disabled ? null : composeEventHandlers(onClickCb),
    onDragEnter: noDrag || disabled ? null : composeEventHandlers(onDragEnter, onDragEnterCb),
    onDragOver: noDrag || disabled ? null : composeEventHandlers(onDragOver, onDragOverCb),
    onDragLeave: noDrag || disabled ? null : composeEventHandlers(onDragLeave, onDragLeaveCb),
    onDrop: noDrag || disabled ? null : onDropCb,
    ...(!disabled && !noKeyboard ? { tabIndex: 0 } : {}),
    style: { cursor: w.showOpenFilePicker ? 'pointer' : '' },
  });

  const getInputProps = () => ({
    fileTypes,
    type: 'file',
    style: { display: 'none' },
    onChange: disabled ? null : onDropCb,
    onClick: disabled
      ? null
      : (event: DropzoneEvent) => {
          event?.stopPropagation();
        },
    autoComplete: 'off',
    tabIndex: -1,
  });

  return [
    state,
    {
      removeFile,
      getRootProps,
      getInputProps,
      rootRef,
      inputRef,
      destroy,
      isFocused: state().isFocused && !disabled,
      open: disabled ? null : openFileDialog,
    },
  ];
}
