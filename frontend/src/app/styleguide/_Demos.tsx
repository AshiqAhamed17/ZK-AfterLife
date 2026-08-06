"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// Client demo island for the styleguide (Modal + Toast need interactivity).
export default function Demos() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-4">
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Button variant="secondary" onClick={() => toast("Will sealed", "seal")}>
        Fire toast
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Seal this will?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast("Will sealed", "seal");
              }}
            >
              Seal will
            </Button>
          </>
        }
      >
        This locks the declared assets until execution. You can withdraw any time
        before then.
      </Modal>
    </div>
  );
}
