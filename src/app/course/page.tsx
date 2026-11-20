import type { Metadata } from "next";
import Course from "@/components/course/Course";

export const metadata: Metadata = {
  title: "Motion Pro — Curso de After Effects | Miguel Dario",
  description:
    "MOTION PRO: 15 aulas em 3 módulos para dominar o After Effects e se destacar no mercado de Motion. Com Miguel Dario (@dario.motion).",
};

export default function CoursePage() {
  return <Course />;
}
