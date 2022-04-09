import { children, JSX } from 'solid-js';
import { createDropzone } from './hook';

type DropZoneProps = {
  children: (props?: ReturnType<typeof createDropzone>) => JSX.Element;
  noKeyboard?: boolean;
  disabled?: boolean;
  noDrag?: boolean;
};

export function DropZone(props: DropZoneProps) {
  return children(() => props.children(createDropzone()));
}
