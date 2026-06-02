import { useStore } from "../../store";
import CategoryTabs from "./CategoryTabs";
import EditModeBar from "./EditModeBar";
import ToolGrid from "../ToolGrid";
import "./grid.css";

export default function ToolGridPanel() {
  const { editMode } = useStore();

  return (
    <>
      <CategoryTabs />
      {editMode && <EditModeBar />}
      <ToolGrid />
    </>
  );
}
