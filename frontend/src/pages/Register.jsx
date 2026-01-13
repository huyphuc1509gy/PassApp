import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Row, Col, Card, CardBody, Form, FormGroup,
    Label, Input, Button, Alert, Progress, FormText,
    Modal, ModalHeader, ModalBody, ModalFooter,
    InputGroup, InputGroupText
} from 'reactstrap';
import { 
    UserPlus, Mail, Lock, Eye, EyeOff, ShieldCheck, 
    ArrowRight, Loader2, AlertTriangle, Key, Copy
} from 'lucide-react'; // Import icons
import zxcvbn from 'zxcvbn';
import api from '../api.jsx';
import { decryptVault, BackupKey, encryptVault, deriveKeys , generateRandomPin} from '../utils/crypto.js';

const Register = () => {
    const navigate = useNavigate();

    // State data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [pin, setPin] = useState('');

    // State UI additional
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassword(val);
        if (val) {
            const result = zxcvbn(val);
            setScore(result.score);
            setFeedback(result.feedback.warning || result.feedback.suggestions[0] || "");
        } else {
            setScore(0);
            setFeedback("");
        }
    }

    const getProgressColor = () => {
        switch (score) {
            case 0: return "danger";
            case 1: return "danger";
            case 2: return "warning";
            case 3: return "info";
            case 4: return "success";
            default: return "secondary";
        }
    };

    // Handle Register , Get random PIN
    // Use pin to encrypt password -> backup
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPass) {
            setError("Password and Retype are not same?");
            return; 
        }
        if (score < 2) {
            setError("Password is too weak");
            return;
        }

        setLoading(true);
        try {
            const randomPin = generateRandomPin();
            const { authKey, encKey } = deriveKeys(email, password); 
            console.log(randomPin)
            const BackupKeyHash = BackupKey(password, randomPin);
            const initVault = encryptVault([], encKey);

            await api.post('/auth/register', {
                email, authKey, BackupKeyHash, initVault
            });

            setPin(randomPin); 

            setShowPinModal(true);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed register");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowPinModal(false);
        navigate('/login');
    };

    return (
        <div className="d-flex align-items-center min-vh-100 bg-light">
            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                        <Card className="shadow-lg border-0 rounded-4">
                            <CardBody className="p-5">
                                {/* Header */}
                                <div className="text-center mb-5">
                                    <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
                                        <UserPlus className="text-primary" size={48} strokeWidth={1.5} />
                                    </div>
                                    <h2 className="fw-bold text-dark">Create Account</h2>
                                    <p className="text-muted">Join us to secure your data</p>
                                </div>

                                {error && (
                                    <Alert color="danger" className="d-flex align-items-center gap-2 border-0 bg-danger bg-opacity-10 text-danger rounded-3 mb-4">
                                        <AlertTriangle size={18} />
                                        <span>{error}</span>
                                    </Alert>
                                )}

                                <Form onSubmit={handleRegister}>
                                    <FormGroup className="mb-4">
                                        <Label for="email" className="fw-medium text-secondary small text-uppercase">Email Address</Label>
                                        <InputGroup className="input-group-lg">
                                            <InputGroupText className="bg-white border-end-0 text-muted">
                                                <Mail size={20} />
                                            </InputGroupText>
                                            <Input
                                                type="email" id="email" required
                                                placeholder="user@example.com"
                                                className="border-start-0 ps-0"
                                                value={email} onChange={e => setEmail(e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </InputGroup>
                                    </FormGroup>

                                    <FormGroup className="mb-4">
                                        <Label for="password" className="fw-medium text-secondary small text-uppercase">Master Password</Label>
                                        <InputGroup className="input-group-lg">
                                            <InputGroupText className="bg-white border-end-0 text-muted">
                                                <Lock size={20} />
                                            </InputGroupText>
                                            <Input
                                                type={showPass ? "text" : "password"} 
                                                id="password" required
                                                placeholder="••••••••"
                                                className="border-start-0 border-end-0 ps-0"
                                                value={password} onChange={handlePasswordChange}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            <InputGroupText 
                                                className="bg-white border-start-0 cursor-pointer" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setShowPass(!showPass)}
                                            >
                                                {showPass ? <EyeOff size={20} className="text-muted"/> : <Eye size={20} className="text-muted"/>}
                                            </InputGroupText>
                                        </InputGroup>

                                        {password && (
                                            <div className="mt-2">
                                                <Progress value={(score + 1) * 20} color={getProgressColor()} style={{ height: "6px" }} className="rounded-pill mb-1" />
                                                <FormText className={`small text-${getProgressColor()}`}>
                                                    Strength: {["Very Weak", "Weak", "Fair", "Strong", "Very Strong"][score]}
                                                    {feedback && ` - ${feedback}`}
                                                </FormText>
                                            </div>
                                        )}
                                    </FormGroup>

                                    <FormGroup className="mb-4">
                                        <Label for="confirmPass" className="fw-medium text-secondary small text-uppercase">Confirm Password</Label>
                                        <InputGroup className="input-group-lg">
                                            <InputGroupText className="bg-white border-end-0 text-muted">
                                                <ShieldCheck size={20} />
                                            </InputGroupText>
                                            <Input
                                                type={showConfirmPass ? "text" : "password"} 
                                                id="confirmPass" required
                                                placeholder="••••••••"
                                                className="border-start-0 border-end-0 ps-0"
                                                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            <InputGroupText 
                                                className="bg-white border-start-0 cursor-pointer" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                            >
                                                {showConfirmPass ? <EyeOff size={20} className="text-muted"/> : <Eye size={20} className="text-muted"/>}
                                            </InputGroupText>
                                        </InputGroup>
                                    </FormGroup>

                                    <Button color="primary" block size="lg" disabled={loading} className="rounded-3 mt-2 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm">
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" /> Creating Account...
                                            </>
                                        ) : (
                                            <>
                                                Create Account <ArrowRight size={20} />
                                            </>
                                        )}
                                    </Button>
                                </Form>

                                <div className="text-center mt-4">
                                    <span className="text-muted">Already have an account? </span>
                                    <Link to="/login" className="text-decoration-none fw-bold text-primary">Login now</Link>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Modal show pin code */}
                <Modal isOpen={showPinModal} toggle={() => { }} backdrop="static" centered className="modal-lg">
                    <div className="p-2">
                        <ModalHeader className="border-0 pb-0 d-flex justify-content-center">
                            <div className="text-center w-100 mt-2">
                                <div className="bg-success bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
                                    <Key className="text-success" size={48} />
                                </div>
                                <h3 className="fw-bold text-success">Registration Successful! 🎉</h3>
                            </div>
                        </ModalHeader>
                        <ModalBody className="text-center p-4">
                            <p className="text-muted mb-2">Your secure vault has been created.</p>
                            <p className="fw-bold text-danger text-uppercase letter-spacing-1">Here is your recovery PIN:</p>

                            <div className="p-4 bg-light border border-dashed border-danger border-opacity-50 rounded-3 mb-4 position-relative">
                                <h1 className="text-primary mb-0 fw-bold font-monospace tracking-wider display-5">
                                    {pin}
                                </h1>
                            </div>

                            <Alert color="warning" className="text-start border-0 bg-warning bg-opacity-10 text-dark rounded-3 p-3" fade={false}>
                                <h6 className="fw-bold alert-heading d-flex align-items-center gap-2">
                                    <AlertTriangle size={20} className="text-danger"/> IMPORTANT NOTICE:
                                </h6>
                                <ul className="mb-0 ps-3 small mt-2">
                                    <li>We do <strong>NOT</strong> store this PIN on our servers.</li>
                                    <li>If you forget your Master Password, this is the <strong>ONLY</strong> way to recover your data.</li>
                                    <li>Please write it down or save it in a secure location immediately.</li>
                                </ul>
                            </Alert>
                        </ModalBody>
                        <ModalFooter className="border-0 justify-content-center pb-4">
                            <Button color="primary" size="lg" className="rounded-3 px-5 fw-bold py-3" onClick={handleCloseModal}>
                                I have saved my PIN & Go to Login
                            </Button>
                        </ModalFooter>
                    </div>
                </Modal>
            </Container>
        </div>
    )
}
export default Register;