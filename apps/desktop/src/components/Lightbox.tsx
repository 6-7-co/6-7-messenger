import { CloseIcon } from './Icons';

interface LightboxProps {
  url: string;
  onClose: () => void;
}

export function Lightbox({ url, onClose }: LightboxProps) {
  return (
    <div className="lightbox" onClick={onClose}>
      <img src={url} alt="" onClick={(e) => e.stopPropagation()} />
      <button className="lightbox-close" onClick={onClose} title="Close">
        <CloseIcon size={22} />
      </button>
    </div>
  );
}
