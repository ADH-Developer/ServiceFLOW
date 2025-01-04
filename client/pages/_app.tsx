import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { customTheme } from "../themes";
import { TabProvider } from "../contexts/TabContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={customTheme}>
      <TabProvider>
        <Component {...pageProps} />
      </TabProvider>
    </ChakraProvider>
  );
}

export default MyApp;
