// import React from "react";

// export default function Modal({
//   open,
//   title,
//   onClose,
//   children,
// }: {
//   open: boolean;
//   title: string;
//   onClose: () => void;
//   children: React.ReactNode;
// }) {
//   if (!open) return null;

//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <b>{title}</b>
//           <button className="btn" onClick={onClose}>
//             ✕
//           </button>
//         </div>
//         <div>{children}</div>
//       </div>
//     </div>
//   );
// }


import React, { useEffect } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <b>{title}</b>
          <button className="btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ✅ THIS IS THE KEY */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}