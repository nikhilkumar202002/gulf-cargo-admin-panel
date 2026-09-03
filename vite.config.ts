import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20_000,
          groups: [
            {
              name: "charts",
              test: /node_modules[\\/]recharts[\\/]/,
            },
            {
              name: "documents",
              test: /node_modules[\\/](xlsx|jspdf|pdfmake|html2canvas|html2pdf\.js|jspdf-autotable|react-to-print)[\\/]/,
            },
            {
              name: "ui",
              test: /node_modules[\\/](@mui|@radix-ui|@emotion|framer-motion|react-icons|lucide-react)[\\/]/,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
            },
          ],
        },
      },
    },
  },
});
