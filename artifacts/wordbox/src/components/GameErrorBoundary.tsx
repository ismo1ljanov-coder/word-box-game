import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  gameName?: string;
}
interface State {
  hasError: boolean;
  errorMsg: string;
}

export default class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMsg: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GameErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMsg: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto mt-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300 px-4">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl" role="img" aria-label="error">😅</span>
          </div>
          <h2 className="text-2xl font-black">Xato yuz berdi</h2>
          <p className="text-muted-foreground text-lg">
            {this.props.gameName
              ? `"${this.props.gameName}" o'yinida kutilmagan muammo yuz berdi.`
              : "O'yinda kutilmagan muammo yuz berdi."}
          </p>
          <p className="text-muted-foreground text-sm">Qayta urinib ko'ring yoki bosh sahifaga qayting.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={this.handleReset} className="rounded-xl font-bold px-8">
              Qayta urinish
            </Button>
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => { window.location.href = "/games"; }}
            >
              O'yinlarga
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
