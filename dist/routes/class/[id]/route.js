export function GET(req, res) {
    const { id } = req.params;
    res.status(200).json({
        status: true,
        message: req.params,
        data: null
    });
}
