using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;

namespace HealthProber.API.Infrastructure;

public class TrayApplicationContext : ApplicationContext
{
    private readonly NotifyIcon _trayIcon;
    private readonly int _port;
    private readonly CancellationTokenSource _cts;
    private readonly ToolStripMenuItem _installUpdateItem;

    public TrayApplicationContext(
        int port,
        CancellationTokenSource cts,
        Func<Task> onCheckForUpdates,
        Func<Task> onInstallUpdate)
    {
        _port = port;
        _cts = cts;

        _trayIcon = new NotifyIcon
        {
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? SystemIcons.Application,
            Text = $"HealthProber (localhost:{port})",
            Visible = true
        };

        var menu = new ContextMenuStrip();
        menu.Items.Add("Open HealthProber", null, OnOpenClicked);
        menu.Items.Add(new ToolStripSeparator());

        var checkUpdateItem = new ToolStripMenuItem("Check for Updates", null, async (s, e) => await onCheckForUpdates());
        menu.Items.Add(checkUpdateItem);

        _installUpdateItem = new ToolStripMenuItem("Install Update & Restart", null, async (s, e) => await onInstallUpdate())
        {
            Enabled = false
        };
        menu.Items.Add(_installUpdateItem);

        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Exit", null, OnExitClicked);

        _trayIcon.ContextMenuStrip = menu;
        _trayIcon.DoubleClick += OnOpenClicked;

        _trayIcon.BalloonTipTitle = "HealthProber";
        _trayIcon.BalloonTipText = $"Running on http://localhost:{port}";
        _trayIcon.ShowBalloonTip(3000);
    }

    public void EnableInstallUpdate(string version)
    {
        _installUpdateItem.Text = $"Install Update & Restart ({version})";
        _installUpdateItem.Enabled = true;

        _trayIcon.BalloonTipTitle = "HealthProber Update Available";
        _trayIcon.BalloonTipText = $"Version {version} is available. Right-click the tray icon to install.";
        _trayIcon.ShowBalloonTip(5000);
    }

    private void OnOpenClicked(object? sender, EventArgs e)
    {
        Process.Start(new ProcessStartInfo($"http://localhost:{_port}") { UseShellExecute = true });
    }

    private void OnExitClicked(object? sender, EventArgs e)
    {
        _trayIcon.Visible = false;
        _trayIcon.Dispose();
        _cts.Cancel();
        ExitThread();
    }
}
