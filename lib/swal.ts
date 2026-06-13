async function swal(options: {
  icon: "success" | "error" | "warning" | "info";
  title: string;
  text?: string;
  showConfirmButton?: boolean;
  confirmButtonText?: string;
  confirmButtonColor?: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  cancelButtonColor?: string;
}) {
  const { default: Swal } = await import("sweetalert2");
  return Swal.fire(options);
}

export function swalSuccess(title: string, text?: string) {
  return swal({
    icon: "success",
    title,
    text,
    showConfirmButton: true,
    confirmButtonText: "OK",
    confirmButtonColor: "#22c55e",
  });
}

export function swalError(title: string, text?: string) {
  return swal({
    icon: "error",
    title,
    text,
    showConfirmButton: true,
    confirmButtonText: "OK",
    confirmButtonColor: "#ef4444",
  });
}
