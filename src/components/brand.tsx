import Image from "next/image";
import { Link } from "@heroui/react/link";
export function Brand({ admin = false }: { admin?: boolean }) {
  return (
    <Link
      href={admin ? "/admin" : "/"}
      className="brand"
      aria-label="Limpebras, início"
    >
      <Image
        src="/logotipo.png"
        alt="Limpebras — Engenharia Ambiental"
        width={1590}
        height={361}
        priority
      />
    </Link>
  );
}
