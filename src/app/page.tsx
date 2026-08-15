import { WorkoutApp } from "@/components/workout-app";
import { TEST_WORKOUT } from "@/lib/workout";

export default function Home() {
  return <WorkoutApp initialWorkouts={[TEST_WORKOUT]} />;
}
