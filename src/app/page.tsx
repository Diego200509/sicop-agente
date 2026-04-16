import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold">Inicio del sistema</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Base inicial lista para recibir revisiones desde n8n.
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button>Ir al dashboard</Button>
          </Link>
          <Link href="/tareas">
            <Button variant="ghost">Ver tareas</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
