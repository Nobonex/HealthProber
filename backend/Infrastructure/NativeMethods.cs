using System.Runtime.InteropServices;

namespace HealthProber.API.Infrastructure;

internal static class NativeMethods
{
    [DllImport("kernel32.dll")]
    public static extern nint GetConsoleWindow();

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int MessageBox(nint hWnd, string text, string caption, uint type);
}
